import json
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from users.models import User  # Import your User model
from calls.models import CallSession  # Import CallSession model
from channels.db import database_sync_to_async

class MyWebSocketConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        query_string = self.scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        token = params.get("token", [None])[0]

        self.user = await self.get_user_from_token(token)
        if not self.user or isinstance(self.user, AnonymousUser):
            await self.close()
            return

        self.room_group_name = f"video_{self.user.id}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        print(f"✅ WebSocket connected for user: {self.user.id}")

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
            print(f"❌ WebSocket disconnected for user: {self.user.id}")

    async def receive(self, text_data):
        print(f"📩 Received WebSocket message: {text_data}")
        try:
            data = json.loads(text_data)
            message_type = data.get("type")
            target_user_id = data.get("userId")
            signal_data = data.get("signalData")
            call_session_id = data.get("callSessionId")

            print(f"Message Type: {message_type}, Target User ID: {target_user_id}, Call Session ID: {call_session_id}, Signal Data: {signal_data}")

            if message_type == "call-user" and target_user_id and signal_data and call_session_id:
                print(f"📞 Received call-user request from {self.user.id} to {target_user_id} for session {call_session_id}")
                call_session = await self.get_call_session(call_session_id)
                target_user = await self.get_user_by_id(target_user_id)
                if not call_session or not target_user:
                    print(f"🚨 Invalid call session {call_session_id} or target user {target_user_id}")
                    await self.send(text_data=json.dumps({
                        "type": "error",
                        "message": "Invalid call session or target user",
                    }))
                    return

                await self.channel_layer.group_send(
                    f"video_{target_user_id}",
                    {
                        "type": "incoming_call",
                        "call_session_id": call_session_id,
                        "from_user_id": self.user.id,
                        "from_user_name": self.user.username,
                        "signal_data": signal_data,
                    }
                )

            elif message_type == "call-accepted":
                print(f"✅ Call accepted by {self.user.id} with signal type: {signal_data.get('type') if signal_data else 'None'}")
                if not target_user_id:
                    print(f"⚠️ Missing target_user_id, cannot relay to sender")
                if not call_session_id:
                    print(f"⚠️ Missing call_session_id, using 'unknown'")
                    call_session_id = "unknown"
                if not signal_data:
                    print(f"⚠️ Missing signal_data, cannot proceed")
                else:
                    if target_user_id:
                        await self.channel_layer.group_send(
                            f"video_{target_user_id}",
                            {
                                "type": "call_accepted",
                                "call_session_id": call_session_id,
                                "from_user_id": self.user.id,
                                "signal_data": signal_data,
                            }
                        )
                        print(f"✅ Relayed call-accepted to video_{target_user_id}")
                    else:
                        print(f"⚠️ Skipping relay due to missing target_user_id")
            else:
                print(f"⚠️ Unhandled message type or missing fields: {data}")

        except json.JSONDecodeError:
            print("⚠️ Invalid JSON data received")
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": "Invalid JSON data",
            }))
            
    async def incoming_call(self, event):
        print(f"📞 Incoming call for {self.user.id} from {event['from_user_id']}")
        await self.send(text_data=json.dumps({
            "type": "incoming-call",
            "call_session_id": event["call_session_id"],
            "from_user_id": event["from_user_id"],
            "from_user_name": event["from_user_name"],
            "signalData": event["signal_data"],
        }))

    async def call_accepted(self, event):
        print(f"✅ Call accepted signal sent to {self.user.id} from {event['from_user_id']}")
        await self.send(text_data=json.dumps({
            "type": "answer",
            "call_session_id": event["call_session_id"],
            "signalData": event["signal_data"],
        }))

    @database_sync_to_async
    def get_user_from_token(self, token):
        """Authenticate user from JWT token."""
        if not token:
            return AnonymousUser()
        try:
            access_token = AccessToken(token)
            return User.objects.get(id=access_token["user_id"])
        except Exception as e:
            print(f"⚠️ Token authentication failed: {e}")
            return AnonymousUser()

    @database_sync_to_async
    def get_user_by_id(self, user_id):
        """Retrieve user from the database."""
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

    @database_sync_to_async
    def get_call_session(self, call_session_id):
        """Retrieve call session from the database."""
        try:
            return CallSession.objects.get(id=call_session_id)
        except CallSession.DoesNotExist:
            return None
