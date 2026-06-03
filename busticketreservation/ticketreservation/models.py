# ticketreservation/models.py
from django.db import models
from django.contrib.auth.models import User
import uuid

class Bus(models.Model):
    bus_name = models.CharField(max_length=100)
    source = models.CharField(max_length=100)
    dest = models.CharField(max_length=100)
    date = models.DateField()
    time = models.TimeField()
    total_seats = models.PositiveIntegerField()
    available_seats = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=8, decimal_places=2)

    def __str__(self):
        return f"{self.bus_name} ({self.source} -> {self.dest})"

class Booking(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending Payment'),
        ('CONFIRMED', 'Confirmed'),
        ('CANCELLED', 'Cancelled'),
    ]
    ticket_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    bus = models.ForeignKey(Bus, on_delete=models.CASCADE)
    
    # Track seat arrays for rapid occupancy lookups
    selected_seats = models.JSONField(default=list) 
    
    # --- UPGRADE: Store complete metadata per ticket slot ---
    # Structure: [{"seat": "L-1A", "name": "Madhavan", "age": 22, "gender": "M"}]
    passenger_details = models.JSONField(default=list)
    
    seats_booked = models.PositiveIntegerField()
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    booked_on = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Ticket {self.ticket_id} - {self.user.username}"