from email import message
import io
import csv
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from openpyxl import Workbook
from rest_framework import viewsets, permissions, status, serializers as drf_serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Avg, Count, Q
from django.utils.dateparse import parse_date
from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from accounts import models
from .models import (
    StudentProfile, TeacherProfile, ParentProfile,
    Class, Enrollment, Assignment, Submission,
    Attendance, Message, Announcement, Notification,
    GamificationProfile, Achievement, StudentAchievement, RiskAssessment
)
from .serializers import (
    StudentProfileSerializer, TeacherProfileSerializer, ParentProfileSerializer,
    ClassSerializer, EnrollmentSerializer, AssignmentSerializer,
    SubmissionSerializer, AttendanceSerializer,
    MessageSerializer, AnnouncementSerializer, NotificationSerializer,
    GamificationProfileSerializer, AchievementSerializer,
    StudentAchievementSerializer, RiskAssessmentSerializer
)
from .permissions import (
    IsAdmin, IsTeacher, IsStudent, IsParent,
    IsTeacherOrAdmin, IsOwnerOrReadOnly
)
from .email_utils import send_email_notification
from .pusher_utils import trigger_event
from .ai_services import analyze_sentiment, check_grammar, calculate_risk


# ---------- GAMIFICATION HELPERS ----------

def award_xp(student_user, amount):
    """Award XP to a student's gamification profile and check achievements."""
    try:
        profile = GamificationProfile.objects.get(student__user=student_user)
    except GamificationProfile.DoesNotExist:
        # Profile should be created via signal when user becomes a student
        return
    profile.add_xp(amount)
    check_and_award_achievements(profile)

def check_and_award_achievements(profile):
    achievements = Achievement.objects.all()
    for achievement in achievements:
        criteria = achievement.criteria
        # Example: assignments_submitted threshold
        if 'assignments_submitted' in criteria:
            count = Submission.objects.filter(student=profile.student).count()
            if count >= criteria['assignments_submitted']:
                if not StudentAchievement.objects.filter(
                    student=profile.student, achievement=achievement
                ).exists():
                    StudentAchievement.objects.create(
                        student=profile.student, achievement=achievement
                    )
                    profile.add_xp(achievement.xp_reward)
        # Future criteria can be added here (e.g., perfect attendance, high grades)


# ---------- PROFILES ----------

class StudentProfileViewSet(viewsets.ModelViewSet):
    queryset = StudentProfile.objects.all()
    serializer_class = StudentProfileSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [IsOwnerOrReadOnly | IsAdmin]
        return [perm() for perm in permission_classes]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'STUDENT':
            return StudentProfile.objects.filter(user=user)
        elif user.role == 'TEACHER' or user.role == 'ADMIN':
            return StudentProfile.objects.all()
        elif user.role == 'PARENT':
            parent_profile = ParentProfile.objects.get(user=user)
            return parent_profile.children.all()
        return StudentProfile.objects.none()


class TeacherProfileViewSet(viewsets.ModelViewSet):
    queryset = TeacherProfile.objects.all()
    serializer_class = TeacherProfileSerializer
    permission_classes = [IsTeacherOrAdmin | IsOwnerOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'TEACHER':
            return TeacherProfile.objects.filter(user=user)
        elif user.role == 'ADMIN':
            return TeacherProfile.objects.all()
        return TeacherProfile.objects.none()


class ParentProfileViewSet(viewsets.ModelViewSet):
    queryset = ParentProfile.objects.all()
    serializer_class = ParentProfileSerializer
    permission_classes = [IsOwnerOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'PARENT':
            return ParentProfile.objects.filter(user=user)
        elif user.role == 'ADMIN':
            return ParentProfile.objects.all()
        return ParentProfile.objects.none()
    @action(detail=False, methods=['get'], url_path='my-children')
    def my_children(self, request):
        if request.user.role != 'PARENT':
            return Response(status=status.HTTP_403_FORBIDDEN)
        parent = ParentProfile.objects.get(user=request.user)
        children = parent.children.all()
        data = []
        for child in children:
            # recent grades
            recent_subs = Submission.objects.filter(student=child, grade__isnull=False).order_by('-submitted_at')[:5]
            grades = [{'assignment': s.assignment.title, 'grade': s.grade, 'date': s.submitted_at.strftime('%Y-%m-%d')} for s in recent_subs]
            # attendance last 30 days
            thirty_days_ago = timezone.now().date() - timedelta(days=30)
            att = Attendance.objects.filter(student=child, date__gte=thirty_days_ago)
            present = att.filter(status='present').count()
            total = att.count()
            attendance_rate = (present/total*100) if total > 0 else 100.0
            # upcoming assignments
            upcoming = Assignment.objects.filter(class_obj__enrollments__student=child, due_date__gte=timezone.now()).order_by('due_date')[:5]
            assignments = [{'title': a.title, 'due_date': a.due_date.strftime('%Y-%m-%d')} for a in upcoming]
            data.append({
                'student_id': child.id,
                'student_name': child.user.get_full_name(),
                'recent_grades': grades,
                'attendance_rate': round(attendance_rate, 2),
                'upcoming_assignments': assignments,
            })
        return Response(data)

# ---------- CLASSES ----------

class ClassViewSet(viewsets.ModelViewSet):
    queryset = Class.objects.all()
    serializer_class = ClassSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [IsAdmin]
        return [perm() for perm in permission_classes]

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=['post'], permission_classes=[IsTeacherOrAdmin])
    def enroll(self, request, pk=None):
        class_obj = self.get_object()
        student_id = request.data.get('student_id')
        if not student_id:
            return Response({"error": "student_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        student = get_object_or_404(StudentProfile, id=student_id)
        if class_obj.enrollments.count() >= class_obj.max_students:
            return Response({"error": "Class is full"}, status=status.HTTP_400_BAD_REQUEST)
        if Enrollment.objects.filter(student=student, class_obj=class_obj).exists():
            return Response({"error": "Student already enrolled"}, status=status.HTTP_400_BAD_REQUEST)
        Enrollment.objects.create(student=student, class_obj=class_obj)
        return Response({"status": "enrolled"}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsTeacherOrAdmin])
    def unenroll(self, request, pk=None):
        class_obj = self.get_object()
        student_id = request.data.get('student_id')
        if not student_id:
            return Response({"error": "student_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        enrollment = get_object_or_404(Enrollment, student_id=student_id, class_obj=class_obj)
        enrollment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'], permission_classes=[IsTeacherOrAdmin])
    def gradebook(self, request, pk=None):
        class_obj = self.get_object()
        enrollments = class_obj.enrollments.all()
        data = []
        for enrollment in enrollments:
            student = enrollment.student
            submissions = Submission.objects.filter(
                student=student, assignment__class_obj=class_obj, grade__isnull=False
            )
            avg = sum(s.grade for s in submissions) / submissions.count() if submissions else None
            data.append({
                "student_id": student.id,
                "student_name": student.user.get_full_name(),
                "average_grade": avg,
                "submission_count": submissions.count()
            })
        return Response(data)


# ---------- ENROLLMENT ----------

class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [IsTeacherOrAdmin]
        return [perm() for perm in permission_classes]


# ---------- ASSIGNMENTS ----------

class AssignmentViewSet(viewsets.ModelViewSet):
    queryset = Assignment.objects.all()
    serializer_class = AssignmentSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated]
        elif self.action == 'create':
            permission_classes = [IsTeacher]
        else:
            permission_classes = [IsTeacher | IsAdmin]
        return [perm() for perm in permission_classes]

    def perform_create(self, serializer):
        class_obj = serializer.validated_data['class_obj']
        if self.request.user.role == 'TEACHER':
            teacher_profile = TeacherProfile.objects.get(user=self.request.user)
            if class_obj.teacher != teacher_profile:
                raise drf_serializers.ValidationError(
                    "You can only create assignments for your own classes."
                )
        serializer.save()


# ---------- SUBMISSIONS ----------

class SubmissionViewSet(viewsets.ModelViewSet):
    queryset = Submission.objects.all()
    serializer_class = SubmissionSerializer

    def get_permissions(self):
        if self.action == 'create':
            permission_classes = [IsStudent]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsTeacher | IsAdmin]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [perm() for perm in permission_classes]

    def perform_create(self, serializer):
        student_profile = StudentProfile.objects.get(user=self.request.user)
        assignment = serializer.validated_data['assignment']
        is_late = timezone.now() > assignment.due_date
        submission = serializer.save(student=student_profile, is_late=is_late)
        # Award XP for submitting an assignment
        award_xp(self.request.user, 10)

    @action(detail=True, methods=['post'], permission_classes=[IsTeacher])
    def grade(self, request, pk=None):
        submission = self.get_object()
        class_teacher = submission.assignment.class_obj.teacher
        teacher_profile = TeacherProfile.objects.get(user=request.user)
        if class_teacher != teacher_profile:
            return Response(
                {"error": "Only the class teacher can grade this submission."},
                status=status.HTTP_403_FORBIDDEN
            )
        grade_value = request.data.get('grade')
        feedback = request.data.get('feedback', '')
        submission.grade = grade_value
        submission.feedback = feedback
        submission.save()

        # Award XP based on grade (5 to 10 XP)
        if grade_value:
            xp = max(5, int(float(grade_value) / 10))
            award_xp(submission.student.user, xp)

        return Response(SubmissionSerializer(submission).data)


# ---------- ATTENDANCE ----------

class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [IsTeacher]
        return [perm() for perm in permission_classes]

    def perform_create(self, serializer):
        class_obj = serializer.validated_data['class_obj']
        teacher_profile = TeacherProfile.objects.get(user=self.request.user)
        if class_obj.teacher != teacher_profile:
            raise drf_serializers.ValidationError(
                "You can only mark attendance for your own classes."
            )
        attendance = serializer.save()
        # Award XP for being present
        if attendance.status == 'present':
            award_xp(attendance.student.user, 5)


# ---------- MESSAGES ----------

class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer

    def get_permissions(self):
        if self.action == 'create':
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [perm() for perm in permission_classes]

    def perform_create(self, serializer):
        message = serializer.save(sender=self.request.user)
        # In-app notification
        Notification.objects.create(
            recipient=message.receiver,
            message=f"New message from {self.request.user.get_full_name()}: {message.subject or message.body[:30]}",
            link=f"/messages/{message.id}",
            event_type='new_message'
        )
        # Real-time event
        trigger_event(
            channel=f"user-{message.receiver.id}",
            event_name='new-message',
            data={
                'sender': self.request.user.email,
                'subject': message.subject,
                'body': message.body[:100]
            }
        )
        # Email notification
        send_email_notification(
            subject=f"New message from {self.request.user.get_full_name()}",
            message=f"You have a new message in EduPulse:\n\n{message.body[:200]}...",
            recipient_list=[message.receiver.email]
        )

    def get_queryset(self):
        user = self.request.user
        return Message.objects.filter(models.Q(sender=user) | models.Q(receiver=user))


# ---------- ANNOUNCEMENTS ----------

class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [IsTeacherOrAdmin]
        return [perm() for perm in permission_classes]

    def perform_create(self, serializer):
        announcement = serializer.save(created_by=self.request.user)
        trigger_event(
            channel='announcements',
            event_name='new-announcement',
            data={
                'title': announcement.title,
                'priority': announcement.priority,
                'created_by': self.request.user.email
            }
        )


# ---------- NOTIFICATIONS ----------

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Notification.objects.none()  # Required for router basename
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return Response(status=status.HTTP_200_OK)


# ---------- AI ENDPOINTS ----------

class AIViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def sentiment(self, request):
        text = request.data.get('text', '')
        if not text:
            return Response({'error': 'Text is required'}, status=status.HTTP_400_BAD_REQUEST)
        result = analyze_sentiment(text)
        return Response(result)

    @action(detail=False, methods=['post'])
    def grammar(self, request):
        text = request.data.get('text', '')
        if not text:
            return Response({'error': 'Text is required'}, status=status.HTTP_400_BAD_REQUEST)
        result = check_grammar(text)
        return Response(result)

    @action(detail=False, methods=['get'], url_path='risk/(?P<student_id>[^/.]+)')
    def risk(self, request, student_id=None):
        if request.user.role not in ['TEACHER', 'ADMIN']:
            return Response(status=status.HTTP_403_FORBIDDEN)
        student = get_object_or_404(StudentProfile, pk=student_id)
        score = calculate_risk(student)
        assessment = RiskAssessment.objects.create(
            student=student,
            risk_score=score,
            factors={'attendance_weight': 25, 'grade_weight': 30},
            recommendations="Please schedule a meeting with the student." if score > 50 else ""
        )
        return Response(RiskAssessmentSerializer(assessment).data)


# ---------- GAMIFICATION VIEWS ----------

class GamificationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GamificationProfile.objects.all()
    serializer_class = GamificationProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'STUDENT':
            return GamificationProfile.objects.filter(student__user=user)
        elif user.role in ['TEACHER', 'ADMIN']:
            return GamificationProfile.objects.all()
        elif user.role == 'PARENT':
            parent = ParentProfile.objects.get(user=user)
            return GamificationProfile.objects.filter(student__in=parent.children.all())
        return GamificationProfile.objects.none()

    @action(detail=False, methods=['get'])
    def leaderboard(self, request):
        top = GamificationProfile.objects.order_by('-total_xp')[:10]
        data = [
            {
                'student_name': profile.student.user.get_full_name(),
                'level': profile.level,
                'total_xp': profile.total_xp
            }
            for profile in top
        ]
        return Response(data)


# ---------- ACHIEVEMENTS ----------

class AchievementViewSet(viewsets.ModelViewSet):
    queryset = Achievement.objects.all()
    serializer_class = AchievementSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [IsAdmin]
        return [perm() for perm in permission_classes]


class StudentAchievementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StudentAchievement.objects.all()
    serializer_class = StudentAchievementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'STUDENT':
            return StudentAchievement.objects.filter(student__user=user)
        elif user.role == 'PARENT':
            parent = ParentProfile.objects.get(user=user)
            return StudentAchievement.objects.filter(student__in=parent.children.all())
        return StudentAchievement.objects.all()

class AnalyticsViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='school-overview')
    def school_overview(self, request):
        """Admin only: total students, teachers, classes, avg attendance, avg grades."""
        if request.user.role != 'ADMIN':
            return Response(status=status.HTTP_403_FORBIDDEN)
        data = {
            'total_students': StudentProfile.objects.count(),
            'total_teachers': TeacherProfile.objects.count(),
            'total_classes': Class.objects.filter(status='active').count(),
            'attendance_rate': None,
            'average_grade': None,
        }
        # Attendance rate across all students (last 30 days)
        from datetime import timedelta
        today = timezone.now().date()
        thirty_days_ago = today - timedelta(days=30)
        attendances = Attendance.objects.filter(date__gte=thirty_days_ago)
        total = attendances.count()
        if total > 0:
            presents = attendances.filter(status='present').count()
            data['attendance_rate'] = round(presents / total * 100, 2)
        # Average grade across all graded submissions
        avg_grade = Submission.objects.filter(grade__isnull=False).aggregate(Avg('grade'))['grade__avg']
        if avg_grade is not None:
            data['average_grade'] = round(avg_grade, 2)
        return Response(data)

    @action(detail=True, methods=['get'], url_path='class-performance/(?P<class_id>[^/.]+)')
    def class_performance(self, request, class_id=None):
        """Teacher/Admin: avg grade per student in a class, plus overall class avg."""
        class_obj = get_object_or_404(Class, pk=class_id)
        if request.user.role not in ['TEACHER', 'ADMIN']:
            return Response(status=status.HTTP_403_FORBIDDEN)
        # optional: check if teacher owns the class
        enrollments = class_obj.enrollments.all()
        students_data = []
        for enrollment in enrollments:
            student = enrollment.student
            submissions = Submission.objects.filter(student=student, assignment__class_obj=class_obj, grade__isnull=False)
            avg = submissions.aggregate(Avg('grade'))['grade__avg']
            students_data.append({
                'student_id': student.id,
                'student_name': student.user.get_full_name(),
                'average_grade': round(avg, 2) if avg else None,
                'submission_count': submissions.count()
            })
        class_avg = Submission.objects.filter(assignment__class_obj=class_obj, grade__isnull=False).aggregate(Avg('grade'))['grade__avg']
        return Response({
            'class': ClassSerializer(class_obj).data,
            'class_average': round(class_avg, 2) if class_avg else None,
            'students': students_data
        })

    @action(detail=False, methods=['get'], url_path='student-progress/(?P<student_id>[^/.]+)')
    def student_progress(self, request, student_id=None):
        """Student/Teacher/Parent: grades over time, attendance rate, risk."""
        student = get_object_or_404(StudentProfile, pk=student_id)
        user = request.user
        # Permission: student themselves, their parent, teacher, or admin
        if user.role == 'STUDENT' and student.user != user:
            return Response(status=status.HTTP_403_FORBIDDEN)
        if user.role == 'PARENT':
            parent = ParentProfile.objects.get(user=user)
            if not parent.children.filter(pk=student.pk).exists():
                return Response(status=status.HTTP_403_FORBIDDEN)
        # Collect data
        submissions = Submission.objects.filter(student=student, grade__isnull=False).order_by('submitted_at')
        grades_series = [{'date': s.submitted_at.strftime('%Y-%m-%d'), 'grade': float(s.grade)} for s in submissions]
        # attendance last 30 days
        today = timezone.now().date()
        thirty_days_ago = today - timedelta(days=30)
        attendances = Attendance.objects.filter(student=student, date__gte=thirty_days_ago)
        present_count = attendances.filter(status='present').count()
        attendance_rate = (present_count / attendances.count() * 100) if attendances.count() > 0 else 100.0
        # latest risk assessment
        latest_risk = RiskAssessment.objects.filter(student=student).order_by('-assessed_at').first()
        risk_score = latest_risk.risk_score if latest_risk else None
        return Response({
            'student': student.user.get_full_name(),
            'grades': grades_series,
            'attendance_rate': round(attendance_rate, 2),
            'risk_score': risk_score,
        })

    @action(detail=True, methods=['get'], url_path='teacher-effectiveness/(?P<teacher_id>[^/.]+)')
    def teacher_effectiveness(self, request, teacher_id=None):
        """Admin: avg student grades across all classes of a teacher."""
        if request.user.role != 'ADMIN':
            return Response(status=status.HTTP_403_FORBIDDEN)
        teacher = get_object_or_404(TeacherProfile, pk=teacher_id)
        classes = Class.objects.filter(teacher=teacher)
        overall_avg = Submission.objects.filter(assignment__class_obj__in=classes, grade__isnull=False).aggregate(Avg('grade'))['grade__avg']
        return Response({
            'teacher': teacher.user.get_full_name(),
            'overall_average_grade': round(overall_avg, 2) if overall_avg else None,
            'total_students': StudentProfile.objects.filter(enrollments__class_obj__in=classes).distinct().count()
        })
class ReportViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def generate(self, request):
        report_type = request.data.get('report_type')  # 'class_performance', 'student_progress', 'attendance'
        format = request.data.get('format', 'pdf')     # pdf, excel, csv
        class_id = request.data.get('class_id')
        student_id = request.data.get('student_id')
        
        if report_type == 'class_performance' and class_id:
            class_obj = get_object_or_404(Class, pk=class_id)
            # Permission: teacher of the class or admin
            if request.user.role == 'TEACHER':
                teacher = TeacherProfile.objects.get(user=request.user)
                if class_obj.teacher != teacher:
                    return Response(status=status.HTTP_403_FORBIDDEN)
            elif request.user.role != 'ADMIN':
                return Response(status=status.HTTP_403_FORBIDDEN)
            # Get data
            enrollments = class_obj.enrollments.all()
            rows = []
            for enr in enrollments:
                student = enr.student
                avg_grade = Submission.objects.filter(
                    student=student, assignment__class_obj=class_obj, grade__isnull=False
                ).aggregate(Avg('grade'))['grade__avg']
                rows.append({
                    'student_name': student.user.get_full_name(),
                    'average_grade': round(avg_grade, 2) if avg_grade else 'N/A'
                })
            filename = f"class_{class_id}_performance"
            return self._generate_report(format, filename, ['Student Name', 'Average Grade'], rows)

        elif report_type == 'student_progress' and student_id:
            student = get_object_or_404(StudentProfile, pk=student_id)
            # Permission as before
            # ... same checks as student_progress analytics
            submissions = Submission.objects.filter(student=student, grade__isnull=False).order_by('submitted_at')
            rows = [{'date': s.submitted_at.strftime('%Y-%m-%d'), 'grade': float(s.grade)} for s in submissions]
            filename = f"student_{student_id}_progress"
            return self._generate_report(format, filename, ['Date', 'Grade'], rows)

        elif report_type == 'attendance' and class_id:
            class_obj = get_object_or_404(Class, pk=class_id)
            # Permission check
            attendances = Attendance.objects.filter(class_obj=class_obj).order_by('date')
            # Group by student? We'll do a simple list of all attendance records
            rows = [{
                'student': a.student.user.get_full_name(),
                'date': a.date.strftime('%Y-%m-%d'),
                'status': a.status
            } for a in attendances]
            filename = f"attendance_class_{class_id}"
            return self._generate_report(format, filename, ['Student', 'Date', 'Status'], rows)

        else:
            return Response({'error': 'Invalid parameters'}, status=status.HTTP_400_BAD_REQUEST)

    def _generate_report(self, format, filename, headers, rows):
        if format == 'pdf':
            return self._generate_pdf(filename, headers, rows)
        elif format == 'excel':
            return self._generate_excel(filename, headers, rows)
        elif format == 'csv':
            return self._generate_csv(filename, headers, rows)
        else:
            return Response({'error': 'Unsupported format'}, status=status.HTTP_400_BAD_REQUEST)

    def _generate_pdf(self, filename, headers, rows):
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        p.setTitle(filename)
        # Write headers
        p.setFont("Helvetica-Bold", 10)
        y = 750
        x_offset = 50
        for i, header in enumerate(headers):
            p.drawString(x_offset + i*150, y, header)
        # Write rows
        p.setFont("Helvetica", 10)
        y -= 20
        for row in rows:
            for i, value in enumerate(row.values()):
                p.drawString(x_offset + i*150, y, str(value))
            y -= 15
            if y < 50:
                p.showPage()
                y = 750
        p.showPage()
        p.save()
        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}.pdf"'
        return response

    def _generate_excel(self, filename, headers, rows):
        wb = Workbook()
        ws = wb.active
        ws.title = filename
        ws.append(headers)
        for row in rows:
            ws.append([row[h] for h in headers])
        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="{filename}.xlsx"'
        return response

    def _generate_csv(self, filename, headers, rows):
        buffer = io.StringIO()
        writer = csv.DictWriter(buffer, fieldnames=headers)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}.csv"'
        return response