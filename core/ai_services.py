import hashlib
import json
from datetime import timedelta
import requests
from django.conf import settings
from django.utils import timezone
from .models import AICache

# ------ Helper for caching ------

def _get_cached_result(content, analysis_type):
    content_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
    try:
        cache_entry = AICache.objects.get(
            content_hash=content_hash,
            analysis_type=analysis_type,
            expires_at__gt=timezone.now()
        )
        return cache_entry.result
    except AICache.DoesNotExist:
        return None

def _set_cache(content, analysis_type, result, ttl_hours=24):
    content_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
    AICache.objects.update_or_create(
        content_hash=content_hash,
        analysis_type=analysis_type,
        defaults={
            'result': result,
            'expires_at': timezone.now() + timedelta(hours=ttl_hours)
        }
    )

# ------ Sentiment Analysis (Hugging Face) ------

def analyze_sentiment(text):
    if not text.strip():
        return {'label': 'neutral', 'score': 0.5, 'confidence': 0.5}
    
    # Check cache
    cached = _get_cached_result(text, 'sentiment')
    if cached:
        return cached

    # Call Hugging Face Inference API
    if settings.HUGGINGFACE_API_TOKEN:
        API_URL = "https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment-latest"
        headers = {"Authorization": f"Bearer {settings.HUGGINGFACE_API_TOKEN}"}
        try:
            response = requests.post(API_URL, headers=headers, json={"inputs": text}, timeout=10)
            if response.status_code == 200:
                result = response.json()
                if isinstance(result, list) and len(result) > 0:
                    # The model returns a list of dicts; pick the highest scoring label
                    best = max(result[0], key=lambda x: x['score'])
                    formatted = {
                        'label': best['label'],
                        'score': best['score'],
                        'confidence': best['score'],
                        'all_scores': {item['label']: item['score'] for item in result[0]}
                    }
                    _set_cache(text, 'sentiment', formatted, ttl_hours=24)
                    return formatted
        except Exception:
            pass
    # Fallback rule-based
    positive_words = ['happy', 'good', 'great', 'excellent', 'love', 'awesome']
    negative_words = ['sad', 'bad', 'terrible', 'hate', 'awful', 'angry']
    text_lower = text.lower()
    pos = sum(1 for w in positive_words if w in text_lower)
    neg = sum(1 for w in negative_words if w in text_lower)
    total = pos + neg
    if total == 0:
        return {'label': 'neutral', 'score': 0.5, 'confidence': 0.5}
    prob_positive = pos / total
    if prob_positive > 0.5:
        return {'label': 'positive', 'score': prob_positive, 'confidence': prob_positive}
    else:
        return {'label': 'negative', 'score': 1 - prob_positive, 'confidence': 1 - prob_positive}

# ------ Grammar Check (LanguageTool) ------

def check_grammar(text):
    if not text.strip():
        return {'matches': []}

    cached = _get_cached_result(text, 'grammar')
    if cached:
        return cached

    # Use LanguageTool public API
    try:
        response = requests.get(
            settings.LANGUAGETOOL_API_URL + '/check',
            params={'text': text, 'language': 'en-US'},
            timeout=10
        )
        if response.status_code == 200:
            result = response.json()
            _set_cache(text, 'grammar', result, ttl_hours=72)
            return result
    except Exception:
        pass
    # Fallback: return no errors
    return {'matches': []}

# ------ Risk Assessment ------

def calculate_risk(student_profile):
    """
    Return a risk score (0-100, higher = more at risk) based on:
    - recent attendance rate
    - average grade in last 5 assignments
    - assignment completion rate
    - gamification engagement (streak)
    """
    from .models import Attendance, Submission, GamificationProfile

    # Attendance rate last 30 days
    today = timezone.now().date()
    thirty_days_ago = today - timedelta(days=30)
    attendances = Attendance.objects.filter(
        student=student_profile,
        date__gte=thirty_days_ago
    )
    total_days = attendances.count()
    absent_days = attendances.filter(status='absent').count()
    attendance_rate = (1 - absent_days / max(total_days, 1)) * 25   # weight 25

    # Average grade last 5 submissions with a grade
    submissions = Submission.objects.filter(
        student=student_profile,
        grade__isnull=False
    ).order_by('-submitted_at')[:5]
    if submissions:
        avg_grade = sum(s.grade for s in submissions) / len(submissions)
        grade_score = (1 - avg_grade / 100) * 30   # weight 30 (lower avg → higher risk)
    else:
        grade_score = 15   # neutral if no data

    # Assignment completion rate last 10 assignments
    recent_assignments = Assignment.objects.filter(
        class_obj__enrollments__student=student_profile
    ).order_by('-due_date')[:10]
    completed = Submission.objects.filter(
        student=student_profile,
        assignment__in=recent_assignments
    ).count()
    completion_rate = (1 - completed / max(len(recent_assignments), 1)) * 20   # weight 20

    # Streak (lower streak = higher risk)
    try:
        gamification = GamificationProfile.objects.get(student=student_profile)
        if gamification.streak_days >= 7:
            streak_score = 0
        else:
            streak_score = (7 - min(gamification.streak_days, 7)) / 7 * 15   # weight 15
    except GamificationProfile.DoesNotExist:
        streak_score = 10   # no gamification, mild risk

    # Behavioural factor (for now static)
    behavioural = 5   # weight 10, but placeholder

    total_risk = attendance_rate + grade_score + completion_rate + streak_score + behavioural
    return min(100, max(0, total_risk))