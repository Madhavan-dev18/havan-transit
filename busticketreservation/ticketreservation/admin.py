from django.contrib import admin
from .models import Bus, Booking

@admin.register(Bus)
class BusAdmin(admin.ModelAdmin):
    list_display = ('bus_name', 'source', 'dest', 'date', 'time', 'total_seats', 'available_seats', 'price')
    search_fields = ('bus_name', 'source', 'dest')
    list_filter = ('date', 'source', 'dest')

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('ticket_id', 'user', 'get_bus_name', 'seats_booked', 'total_price', 'status', 'booked_on')
    list_filter = ('status', 'booked_on')
    readonly_fields = ('ticket_id', 'booked_on')

    def get_bus_name(self, obj):
        return obj.bus.bus_name
    get_bus_name.short_description = 'Bus Name'