from django.core.management.base import BaseCommand
from core.models import Achievement

class Command(BaseCommand):
    help = 'Seed default achievements'

    def handle(self, *args, **kwargs):
        achievements = [
            {'name': 'First Submission', 'description': 'Submit your first assignment', 'criteria': {'assignments_submitted': 1}, 'xp_reward': 20},
            {'name': '5 Submissions', 'description': 'Submit 5 assignments', 'criteria': {'assignments_submitted': 5}, 'xp_reward': 50},
            {'name': '10 Submissions', 'description': 'Submit 10 assignments', 'criteria': {'assignments_submitted': 10}, 'xp_reward': 100},
            {'name': 'Perfect Attendance (7 days)', 'description': 'Attend class for 7 consecutive days', 'criteria': {'attendance_streak': 7}, 'xp_reward': 75},
        ]
        for a in achievements:
            Achievement.objects.get_or_create(name=a['name'], defaults=a)
        self.stdout.write(self.style.SUCCESS('Achievements seeded'))