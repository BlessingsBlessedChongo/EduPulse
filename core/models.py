from django.db import models
from django.conf import settings

# --------------------- PROFILES ---------------------

class StudentProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'STUDENT'}
    )
    date_of_birth = models.DateField(null=True, blank=True)
    grade_level = models.CharField(max_length=50, blank=True)  # e.g., "10th"
    parent_email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    emergency_contact = models.CharField(max_length=100, blank=True)
    emergency_phone = models.CharField(max_length=20, blank=True)
    medical_notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.user.get_full_name()} (Student)"

class TeacherProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'TEACHER'}
    )
    department = models.CharField(max_length=100, blank=True)
    qualification = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f"{self.user.get_full_name()} (Teacher)"

class ParentProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'PARENT'}
    )
    children = models.ManyToManyField(StudentProfile, blank=True)
    relationship = models.CharField(max_length=50, blank=True)  # e.g., "Father", "Mother"
    phone = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f"{self.user.get_full_name()} (Parent)"

# --------------------- ACADEMIC ---------------------

class Class(models.Model):
    name = models.CharField(max_length=100)           # e.g., "Mathematics 101"
    subject = models.CharField(max_length=100)
    teacher = models.ForeignKey(TeacherProfile, on_delete=models.SET_NULL, null=True, related_name='classes')
    room = models.CharField(max_length=50, blank=True)
    schedule = models.TextField(blank=True)            # could store JSON string for flexibility
    academic_year = models.CharField(max_length=20)
    max_students = models.PositiveIntegerField(default=30)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, default='active', choices=(
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ))

    class Meta:
        verbose_name_plural = "Classes"

    def __str__(self):
        return f"{self.name} ({self.academic_year})"

class Enrollment(models.Model):
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='enrollments')
    class_obj = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='enrollments')
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'class_obj')

    def __str__(self):
        return f"{self.student} in {self.class_obj.name}"

class Assignment(models.Model):
    class_obj = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='assignments')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    due_date = models.DateTimeField()
    max_points = models.PositiveIntegerField(default=100)
    attachment = models.FileField(upload_to='assignments/', blank=True, null=True)

    def __str__(self):
        return self.title

class Submission(models.Model):
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='submissions')
    submitted_at = models.DateTimeField(auto_now_add=True)
    file = models.FileField(upload_to='submissions/', blank=True, null=True)
    text_content = models.TextField(blank=True)
    grade = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    feedback = models.TextField(blank=True)
    is_late = models.BooleanField(default=False)

    class Meta:
        unique_together = ('assignment', 'student')

    def __str__(self):
        return f"{self.student} - {self.assignment.title}"

class Attendance(models.Model):
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='attendances')
    class_obj = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='attendances')
    date = models.DateField()
    status = models.CharField(max_length=10, choices=(
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('late', 'Late'),
    ))

    class Meta:
        unique_together = ('student', 'class_obj', 'date')

    def __str__(self):
        return f"{self.student} - {self.date} - {self.status}"

# --------------------- COMMUNICATION ---------------------

class Message(models.Model):
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_messages')
    subject = models.CharField(max_length=200, blank=True)
    body = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"From {self.sender} to {self.receiver}"

class Announcement(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    priority = models.CharField(max_length=10, default='normal', choices=(
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
    ))
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.title
    
class Notification(models.Model):
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    link = models.URLField(blank=True)          # optional deep link to related object
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    event_type = models.CharField(max_length=50, blank=True)  # e.g., 'new_message', 'assignment_due'

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.recipient.email}: {self.message[:50]}"
    

# ---------- AI CACHE ----------

class AICache(models.Model):
    content_hash = models.CharField(max_length=64, unique=True)
    analysis_type = models.CharField(max_length=50)   # sentiment, grammar, risk
    result = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def __str__(self):
        return f"{self.analysis_type} cache ({self.content_hash[:10]})"

# ---------- GAMIFICATION ----------

class GamificationProfile(models.Model):
    student = models.OneToOneField(StudentProfile, on_delete=models.CASCADE, related_name='gamification')
    total_xp = models.PositiveIntegerField(default=0)
    level = models.PositiveIntegerField(default=1)
    streak_days = models.PositiveIntegerField(default=0)
    last_active_date = models.DateField(null=True, blank=True)

    def add_xp(self, amount):
        self.total_xp += amount
        self._recalc_level()
        self.save()

    def _recalc_level(self):
        # Simple level formula: each level requires (level * 100) XP
        level = 1
        xp_needed = 100
        while self.total_xp >= xp_needed:
            level += 1
            xp_needed += level * 100
        self.level = level

    def __str__(self):
        return f"{self.student.user.email} - Lvl {self.level} ({self.total_xp} XP)"

class Achievement(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    icon_url = models.URLField(blank=True)
    criteria = models.JSONField(help_text="e.g., {'assignments_submitted': 10}")   # defines how to earn
    xp_reward = models.PositiveIntegerField(default=50)

    def __str__(self):
        return self.name

class StudentAchievement(models.Model):
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='achievements')
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE)
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'achievement')

    def __str__(self):
        return f"{self.student} - {self.achievement.name}"

# ---------- RISK ASSESSMENT ----------

class RiskAssessment(models.Model):
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='risk_assessments')
    risk_score = models.DecimalField(max_digits=5, decimal_places=2)  # 0-100
    factors = models.JSONField()
    recommendations = models.TextField(blank=True)
    assessed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Risk for {self.student}: {self.risk_score}"