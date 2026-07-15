import pusher
from django.conf import settings

def get_pusher_client():
    if all([settings.PUSHER_APP_ID, settings.PUSHER_KEY, settings.PUSHER_SECRET]):
        return pusher.Pusher(
            app_id=settings.PUSHER_APP_ID,
            key=settings.PUSHER_KEY,
            secret=settings.PUSHER_SECRET,
            cluster=settings.PUSHER_CLUSTER,
            ssl=True
        )
    return None

def trigger_event(channel, event_name, data):
    client = get_pusher_client()
    if client:
        client.trigger(channel, event_name, data)