# ticketreservation/serializers.py
from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Bus, Booking

class RegisterSerializer(serializers.ModelSerializer):
    """Handles validation and secure creation of new passenger profiles."""
    class Meta:
        model = User
        fields = ('username', 'email', 'password')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        # Using create_user automatically hashes the password securely!
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        return user


class BusSerializer(serializers.ModelSerializer):
    """Serializes the core bus fleet inventory."""
    class Meta:
        model = Bus
        fields = '__all__'


class BookingSerializer(serializers.ModelSerializer):
    """Serializes ledger records for confirmed ticket transactions."""
    class Meta:
        model = Booking
        fields = '__all__'
        read_only_fields = ['ticket_id', 'total_price', 'status', 'user', 'booked_on']


# --- NESTED DATA VALIDATION ENGINE ---

class PassengerDetailSerializer(serializers.Serializer):
    """Validates the strict dictionary structure of individual seat allocations."""
    seat = serializers.CharField(max_length=10)
    name = serializers.CharField(max_length=100, min_length=2)
    age = serializers.IntegerField(min_value=1, max_value=120)
    gender = serializers.ChoiceField(choices=['Male', 'Female', 'Other'])


class CreateBookingSerializer(serializers.Serializer):
    """Validates the incoming payload containing a bus ID and a manifest array."""
    bus_id = serializers.IntegerField()
    passenger_details = PassengerDetailSerializer(many=True, min_length=1)