from django.test import TestCase, TransactionTestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
from datetime import date, time
import os
from unittest.mock import patch
from django.db import connection
from rest_framework.exceptions import ValidationError

from ticketreservation.models import Bus, Booking
from ticketreservation.services import process_ticket_transaction
from ticketreservation.tasks import generate_and_send_ticket

class BusModelTest(TestCase):
    def setUp(self):
        self.bus = Bus.objects.create(
            bus_name="Test Bus",
            source="City A",
            dest="City B",
            date=date.today(),
            time=time(10, 0),
            total_seats=40,
            available_seats=40,
            price=100.00
        )

    def test_bus_creation(self):
        self.assertEqual(self.bus.bus_name, "Test Bus")
        self.assertEqual(self.bus.source, "City A")
        self.assertEqual(self.bus.dest, "City B")
        self.assertEqual(self.bus.total_seats, 40)
        self.assertEqual(self.bus.price, 100.00)


class AuthViewsTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_user(self):
        url = reverse('api_register')
        data = {
            "username": "testuser",
            "password": "testpassword123",
            "email": "test@example.com"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)

    def test_register_duplicate_username(self):
        # Create a user first
        User.objects.create_user(username="testuser", password="testpassword123", email="test@example.com")
        
        url = reverse('api_register')
        data = {
            "username": "testuser",
            "password": "newpassword123",
            "email": "another@example.com"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_register_missing_password(self):
        url = reverse('api_register')
        data = {
            "username": "testuser",
            "email": "test@example.com"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_valid_credentials(self):
        User.objects.create_user(username="testuser", password="testpassword123")
        url = reverse('api_token_auth')
        data = {
            "username": "testuser",
            "password": "testpassword123"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)

    def test_login_invalid_credentials(self):
        User.objects.create_user(username="testuser", password="testpassword123")
        url = reverse('api_token_auth')
        data = {
            "username": "testuser",
            "password": "wrongpassword"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('non_field_errors', response.data)


class BusViewsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='test', password='testpassword')
        self.client.force_authenticate(user=self.user)
        self.bus = Bus.objects.create(
            bus_name="Test Bus",
            source="City A",
            dest="City B",
            date=date.today(),
            time=time(10, 0),
            total_seats=40,
            available_seats=40,
            price=100.00
        )

    def test_get_buses(self):
        url = reverse('bus-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_search_buses(self):
        url = reverse('bus-list')
        response = self.client.get(url, {'source': 'City A', 'dest': 'City B'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)


class BookingViewsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='test', password='testpassword')
        self.bus = Bus.objects.create(
            bus_name="Test Bus",
            source="City A",
            dest="City B",
            date=date.today(),
            time=time(10, 0),
            total_seats=40,
            available_seats=40,
            price=100.00
        )

    @patch('ticketreservation.services.generate_and_send_ticket.delay')
    def test_create_booking_authenticated(self, mock_delay):
        self.client.force_authenticate(user=self.user)
        url = reverse('booking-list')
        data = {
            "bus_id": self.bus.id,
            "passenger_details": [
                {"seat": "L-1A", "name": "John Doe", "age": 30, "gender": "Male"}
            ]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'CONFIRMED')
        self.assertEqual(response.data['seats_booked'], 1)
        mock_delay.assert_called_once()

    def test_create_booking_unauthenticated(self):
        url = reverse('booking-list')
        data = {
            "bus_id": self.bus.id,
            "passenger_details": [
                {"seat": "L-1A", "name": "John Doe", "age": 30, "gender": "Male"}
            ]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_booking_invalid_gender_choice(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('booking-list')
        # "M" is not one of the choice options in serializer ('Male', 'Female', 'Other')
        data = {
            "bus_id": self.bus.id,
            "passenger_details": [
                {"seat": "L-1A", "name": "John Doe", "age": 30, "gender": "M"}
            ]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('passenger_details', response.data)

    def test_create_booking_missing_passenger_name(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('booking-list')
        data = {
            "bus_id": self.bus.id,
            "passenger_details": [
                {"seat": "L-1A", "age": 30, "gender": "Male"}
            ]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TicketServicesTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password123')
        self.bus = Bus.objects.create(
            bus_name="Service Bus",
            source="City A",
            dest="City B",
            date=date.today(),
            time=time(10, 0),
            total_seats=40,
            available_seats=40,
            price=100.00
        )

    @patch('ticketreservation.services.generate_and_send_ticket.delay')
    def test_booking_happy_path(self, mock_delay):
        passengers = [{"seat": "L-1A", "name": "Alice", "age": 25, "gender": "Female"}]
        booking = process_ticket_transaction(self.user, self.bus.id, passengers)
        self.assertIsNotNone(booking)
        self.assertEqual(booking.status, 'CONFIRMED')
        self.assertEqual(booking.seats_booked, 1)
        mock_delay.assert_called_once_with(booking.id)

    @patch('ticketreservation.services.generate_and_send_ticket.delay')
    def test_booking_double_booking_fails(self, mock_delay):
        passengers = [{"seat": "L-1A", "name": "Alice", "age": 25, "gender": "Female"}]
        # First booking succeeds
        process_ticket_transaction(self.user, self.bus.id, passengers)
        
        # Second booking for same seat fails
        with self.assertRaises(ValidationError) as context:
            process_ticket_transaction(self.user, self.bus.id, passengers)
        self.assertIn("Seats recently booked", str(context.exception))

    @patch('ticketreservation.services.generate_and_send_ticket.delay')
    def test_booking_insufficient_capacity_fails(self, mock_delay):
        self.bus.available_seats = 1
        self.bus.save()
        
        passengers = [
            {"seat": "L-1A", "name": "Alice", "age": 25, "gender": "Female"},
            {"seat": "L-1B", "name": "Bob", "age": 28, "gender": "Male"}
        ]
        with self.assertRaises(ValidationError) as context:
            process_ticket_transaction(self.user, self.bus.id, passengers)
        self.assertIn("Insufficient capacity", str(context.exception))

    @patch('ticketreservation.services.generate_and_send_ticket.delay')
    def test_booking_sold_out_bus_fails(self, mock_delay):
        self.bus.available_seats = 0
        self.bus.save()
        
        passengers = [{"seat": "L-1A", "name": "Alice", "age": 25, "gender": "Female"}]
        with self.assertRaises(ValidationError) as context:
            process_ticket_transaction(self.user, self.bus.id, passengers)
        self.assertIn("Insufficient capacity", str(context.exception))


class CeleryTaskTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='celeryuser', password='password')
        self.bus = Bus.objects.create(
            bus_name="Celery Bus",
            source="X",
            dest="Y",
            date=date.today(),
            time=time(12, 0),
            total_seats=40,
            available_seats=38,
            price=150.00
        )
        self.booking = Booking.objects.create(
            user=self.user,
            bus=self.bus,
            selected_seats=["L-2A", "L-2B"],
            passenger_details=[
                {"seat": "L-2A", "name": "Tom", "age": 40, "gender": "Male"},
                {"seat": "L-2B", "name": "Jerry", "age": 35, "gender": "Male"}
            ],
            seats_booked=2,
            total_price=300.00,
            status='CONFIRMED'
        )

    def test_pdf_generation_task(self):
        # Call Celery task synchronously
        pdf_path = generate_and_send_ticket(self.booking.id)
        
        self.assertIsNotNone(pdf_path)
        self.assertTrue(os.path.exists(pdf_path))
        self.assertTrue(pdf_path.endswith(f"Ticket_{self.booking.ticket_id}.pdf"))
        
        # Clean up the file to keep workspace pristine
        if os.path.exists(pdf_path):
            os.remove(pdf_path)


import concurrent.futures

class ConcurrencyBookingTest(TransactionTestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username='user1', password='pw')
        self.user2 = User.objects.create_user(username='user2', password='pw')
        self.bus = Bus.objects.create(
            bus_name="Concurrency Bus",
            source="A",
            dest="B",
            date=date.today(),
            time=time(10, 0),
            total_seats=40,
            available_seats=40,
            price=100.00
        )
    
    @patch('ticketreservation.services.generate_and_send_ticket.delay')
    def test_concurrent_seat_booking(self, mock_delay):
        # We try to book the exact same seat from two different users concurrently
        # Note: M is used here inside direct function call since it bypasses DRF serializer validation
        passengers = [{"seat": "L-1A", "name": "John", "age": 30, "gender": "M"}]
        
        def book_ticket(user):
            try:
                # Close old connections in the thread to ensure isolated transactions
                connection.close()
                return process_ticket_transaction(user, self.bus.id, passengers)
            except ValidationError as e:
                return e
            except Exception as e:
                return e
            finally:
                connection.close()
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            future1 = executor.submit(book_ticket, self.user1)
            future2 = executor.submit(book_ticket, self.user2)
            
            result1 = future1.result()
            result2 = future2.result()
            
        results = [result1, result2]
        
        success_count = sum(1 for r in results if type(r).__name__ == 'Booking')
        self.assertLessEqual(success_count, 1, "Concurrency lock failed: Both transactions succeeded!")
        
        # Verify seats were deducted correctly (1 or 0 depending on success_count)
        self.bus.refresh_from_db()
        expected_seats = 40 - success_count
        self.assertEqual(self.bus.available_seats, expected_seats)
