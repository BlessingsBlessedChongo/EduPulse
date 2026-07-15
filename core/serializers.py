from rest_framework import serializers
from .models import (
    Notification, StudentProfile, TeacherProfile, ParentProfile,
    Class, Enrollment, Assignment, Submission,
    Attendance, Message, Announcement,AICache, GamificationProfile, Achievement, StudentAchievement, RiskAssessment
)

# ---------- Profiles ----------

class StudentProfileSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_full_name = serializers.SerializerMethodField()

    class Meta:
        model = StudentProfile
        fields = '__all__'
        read_only_fields = ('user',)   # user is set automatically via signal

    def get_user_full_name(self, obj):
        return obj.user.get_full_name()

class TeacherProfileSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = TeacherProfile
        fields = '__all__'
        read_only_fields = ('user',)

class ParentProfileSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    class Meta:
        model = ParentProfile
        fields = '__all__'
        read_only_fields = ('user',)

# ---------- Class ----------

class ClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = Class
        fields = '__all__'
        # teacher field will be handled by the view (only admin/teacher can set)

class EnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enrollment
        fields = '__all__'

# ---------- Assignment ----------

class AssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assignment
        fields = '__all__'

    def validate(self, data):
        # Ensure the teacher of the assignment matches the class teacher? (We'll handle in view)
        return data

# ---------- Submission ----------

class SubmissionSerializer(serializers.ModelSerializer):
    student_email = serializers.EmailField(source='student.user.email', read_only=True)

    class Meta:
        model = Submission
        fields = '__all__'
        read_only_fields = ('student', 'submitted_at', 'is_late')

    def validate(self, data):
        # Check deadline and mark late automatically (will do in view or model)
        return data

# ---------- Attendance ----------

class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = '__all__'

# ---------- Communication ----------

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = '__all__'
        read_only_fields = ('sender', 'sent_at')

class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = '__all__'

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ('recipient', 'created_at')

class GamificationProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = GamificationProfile
        fields = '__all__'

class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = '__all__'

class StudentAchievementSerializer(serializers.ModelSerializer):
    achievement_details = AchievementSerializer(source='achievement', read_only=True)

    class Meta:
        model = StudentAchievement
        fields = '__all__'

class RiskAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiskAssessment
        fields = '__all__'
        read_only_fields = ('student', 'assessed_at')