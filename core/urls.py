from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'students', views.StudentProfileViewSet)
router.register(r'teachers', views.TeacherProfileViewSet)
router.register(r'parents', views.ParentProfileViewSet)
router.register(r'classes', views.ClassViewSet)
router.register(r'enrollments', views.EnrollmentViewSet)
router.register(r'assignments', views.AssignmentViewSet)
router.register(r'submissions', views.SubmissionViewSet)
router.register(r'attendance', views.AttendanceViewSet)
router.register(r'messages', views.MessageViewSet)
router.register(r'announcements', views.AnnouncementViewSet)
router.register(r'notifications', views.NotificationViewSet)
router.register(r'ai', views.AIViewSet, basename='ai')
router.register(r'gamification', views.GamificationViewSet, basename='gamification')
router.register(r'achievements', views.AchievementViewSet, basename='achievements')
router.register(r'student-achievements', views.StudentAchievementViewSet, basename='student-achievements')
router.register(r'analytics', views.AnalyticsViewSet, basename='analytics')
router.register(r'reports', views.ReportViewSet, basename='reports')

urlpatterns = [
    path('', include(router.urls)),
    path('students/me/', views.StudentMeView.as_view(), name='student-me'),
    path('teachers/me/', views.TeacherMeView.as_view(), name='teacher-me'),

]