import random
from datetime import date, timedelta, datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from accounts.models import User
from core.models import (
    StudentProfile, TeacherProfile, ParentProfile,
    Class, Enrollment, Assignment, Submission,
    Attendance, Message, Announcement, Notification,
    GamificationProfile, Achievement, StudentAchievement,
    RiskAssessment
)

User = get_user_model()

class Command(BaseCommand):
    help = 'Populate the database with demo data'

    def handle(self, *args, **options):
        self.stdout.write('Creating demo data...')

        # ---------- USERS ----------
        # Admin
        admin, _ = User.objects.get_or_create(
            email='admin@edupulse.com',
            defaults={
                'first_name': 'Blessings',
                'last_name': 'Chongo',
                'role': 'ADMIN',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        admin.set_password('Admin123')
        admin.save()

        # Teachers
        teacher1, _ = User.objects.get_or_create(
            email='teacher1@edupulse.com',
            defaults={'first_name': 'Sarah', 'last_name': 'Johnson', 'role': 'TEACHER'}
        )
        teacher1.set_password('Teacher123')
        teacher1.save()
        teacher_profile1 = TeacherProfile.objects.get(user=teacher1)
        teacher_profile1.department = 'Mathematics'
        teacher_profile1.save()

        teacher2, _ = User.objects.get_or_create(
            email='teacher2@edupulse.com',
            defaults={'first_name': 'James', 'last_name': 'Mwansa', 'role': 'TEACHER'}
        )
        teacher2.set_password('Teacher123')
        teacher2.save()
        teacher_profile2 = TeacherProfile.objects.get(user=teacher2)
        teacher_profile2.department = 'Science'
        teacher_profile2.save()

        # Students
        student_data = [
            {'email': 'alex@edupulse.com', 'first': 'Alex', 'last': 'Thompson', 'grade': '11th'},
            {'email': 'mia@edupulse.com', 'first': 'Mia', 'last': 'Banda', 'grade': '10th'},
            {'email': 'john@edupulse.com', 'first': 'John', 'last': 'Phiri', 'grade': '11th'},
            {'email': 'lucy@edupulse.com', 'first': 'Lucy', 'last': 'Tembo', 'grade': '12th'},
            {'email': 'david@edupulse.com', 'first': 'David', 'last': 'Mwale', 'grade': '10th'},
            {'email': 'grace@edupulse.com', 'first': 'Grace', 'last': 'Zulu', 'grade': '11th'},
            {'email': 'peter@edupulse.com', 'first': 'Peter', 'last': 'Mbewe', 'grade': '12th'},
            {'email': 'linda@edupulse.com', 'first': 'Linda', 'last': 'Simwanza', 'grade': '10th'},
            {'email': 'sam@edupulse.com', 'first': 'Sam', 'last': 'Chisanga', 'grade': '11th'},
            {'email': 'anna@edupulse.com', 'first': 'Anna', 'last': 'Mulenga', 'grade': '12th'},
        ]
        students = []
        for s in student_data:
            user, created = User.objects.get_or_create(email=s['email'], defaults={
                'first_name': s['first'],
                'last_name': s['last'],
                'role': 'STUDENT'
            })
            if created:
                user.set_password('Student123')
                user.save()
            student_profile = StudentProfile.objects.get(user=user)
            student_profile.grade_level = s['grade']
            student_profile.save()
            students.append(student_profile)

        # Parents (link to first two students)
        parent1, _ = User.objects.get_or_create(
            email='parent1@edupulse.com',
            defaults={'first_name': 'Maria', 'last_name': 'Rodriguez', 'role': 'PARENT'}
        )
        parent1.set_password('Parent123')
        parent1.save()
        parent_profile1 = ParentProfile.objects.get(user=parent1)
        parent_profile1.children.set([students[0], students[1]])
        parent_profile1.relationship = 'Mother'

        parent2, _ = User.objects.get_or_create(
            email='parent2@edupulse.com',
            defaults={'first_name': 'Robert', 'last_name': 'Chen', 'role': 'PARENT'}
        )
        parent2.set_password('Parent123')
        parent2.save()
        parent_profile2 = ParentProfile.objects.get(user=parent2)
        parent_profile2.children.set([students[2]])
        parent_profile2.relationship = 'Father'

        # ---------- CLASSES ----------
        class1, _ = Class.objects.get_or_create(
            name='Mathematics 101',
            defaults={
                'subject': 'Mathematics',
                'teacher': teacher_profile1,
                'room': 'Room 101',
                'schedule': 'Mon/Wed 9:00-10:30',
                'academic_year': '2026',
                'max_students': 30
            }
        )
        class2, _ = Class.objects.get_or_create(
            name='Physics 201',
            defaults={
                'subject': 'Physics',
                'teacher': teacher_profile2,
                'room': 'Lab 1',
                'schedule': 'Tue/Thu 11:00-12:30',
                'academic_year': '2026',
                'max_students': 25
            }
        )
        class3, _ = Class.objects.get_or_create(
            name='English Literature',
            defaults={
                'subject': 'English',
                'teacher': teacher_profile1,
                'room': 'Room 203',
                'schedule': 'Wed/Fri 14:00-15:30',
                'academic_year': '2026',
                'max_students': 30
            }
        )
        # Enroll all students in class1, first 5 in class2, last 5 in class3
        for s in students:
            Enrollment.objects.get_or_create(student=s, class_obj=class1)
        for s in students[:5]:
            Enrollment.objects.get_or_create(student=s, class_obj=class2)
        for s in students[5:]:
            Enrollment.objects.get_or_create(student=s, class_obj=class3)

        # ---------- ASSIGNMENTS ----------
        now = timezone.now()
        assignment1, _ = Assignment.objects.get_or_create(
            title='Algebra Quiz',
            class_obj=class1,
            defaults={
                'description': 'Complete chapters 1-3 review.',
                'due_date': now + timedelta(days=7),
                'max_points': 50
            }
        )
        assignment2, _ = Assignment.objects.get_or_create(
            title='Physics Lab Report',
            class_obj=class2,
            defaults={
                'description': 'Write a full lab report on the pendulum experiment.',
                'due_date': now + timedelta(days=5),
                'max_points': 100
            }
        )
        assignment3, _ = Assignment.objects.get_or_create(
            title='Essay: Shakespeare’s influence',
            class_obj=class3,
            defaults={
                'description': 'Write a 1000-word essay.',
                'due_date': now + timedelta(days=10),
                'max_points': 80
            }
        )

        # ---------- SUBMISSIONS ----------
        # Create some submissions with grades
        for i, student in enumerate(students[:3]):
            sub, _ = Submission.objects.get_or_create(
                student=student,
                assignment=assignment1,
                defaults={'grade': random.uniform(60, 95), 'feedback': 'Good effort.'}
            )
        sub, _ = Submission.objects.get_or_create(
            student=students[0],
            assignment=assignment2,
            defaults={'grade': 88, 'feedback': 'Excellent analysis.'}
        )
        sub, _ = Submission.objects.get_or_create(
            student=students[1],
            assignment=assignment2,
            defaults={'grade': 72, 'feedback': 'Needs more detail.'}
        )

        # ---------- ATTENDANCE ----------
        today = date.today()
        for days_ago in range(7):
            d = today - timedelta(days=days_ago)
            for student in students[:6]:
                status = random.choice(['present', 'present', 'present', 'absent'])
                Attendance.objects.get_or_create(
                    student=student,
                    class_obj=class1,
                    date=d,
                    defaults={'status': status}
                )

        # ---------- MESSAGES ----------
        Message.objects.get_or_create(
            sender=teacher1,
            receiver=students[0].user,
            subject='Good progress',
            defaults={'body': 'Keep up the great work in Math!'}
        )
        Message.objects.get_or_create(
            sender=parent1,
            receiver=teacher1,
            subject='Question about homework',
            defaults={'body': 'Can you provide extra practice problems?'}
        )

        # ---------- ANNOUNCEMENTS ----------
        Announcement.objects.get_or_create(
            title='Midterm Exam Schedule',
            defaults={
                'content': 'Midterms will be held next week. Check the portal for your timetable.',
                'priority': 'high',
                'created_by': admin
            }
        )

        # ---------- NOTIFICATIONS ----------
        for student in students[:3]:
            Notification.objects.get_or_create(
                recipient=student.user,
                message='New assignment posted: ' + assignment1.title,
                defaults={'event_type': 'assignment_due'}
            )

        # ---------- GAMIFICATION ----------
        for student in students:
            gp, _ = GamificationProfile.objects.get_or_create(student=student)
            gp.total_xp = random.randint(50, 500)
            gp.level = max(1, gp.total_xp // 100)
            gp.streak_days = random.randint(0, 10)
            gp.save()

        # Achievements
        ach1, _ = Achievement.objects.get_or_create(
            name='First Submission',
            defaults={'description': 'Submit your first assignment.', 'criteria': {'assignments_submitted': 1}, 'xp_reward': 20}
        )
        ach2, _ = Achievement.objects.get_or_create(
            name='Perfect Attendance (7 days)',
            defaults={'description': 'Attend class for 7 consecutive days.', 'criteria': {'attendance_streak': 7}, 'xp_reward': 75}
        )
        StudentAchievement.objects.get_or_create(student=students[0], achievement=ach1)
        StudentAchievement.objects.get_or_create(student=students[1], achievement=ach1)

        # ---------- RISK ASSESSMENT ----------
        for student in students[:2]:
            RiskAssessment.objects.get_or_create(
                student=student,
                risk_score=random.uniform(10, 40),
                defaults={'factors': {'attendance': 25, 'grades': 30}}
            )

        self.stdout.write(self.style.SUCCESS('Demo data created successfully!'))
        self.stdout.write('Admin login: admin@edupulse.com / Admin123')
        self.stdout.write('Teacher login: teacher1@edupulse.com / Teacher123')
        self.stdout.write('Student login: alex@edupulse.com / Student123')
        self.stdout.write('Parent login: parent1@edupulse.com / Parent123')