from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token
from .views import BusViewSet, BookingViewSet, RegisterView

router = DefaultRouter()
router.register(r'buses', BusViewSet, basename='bus')
router.register(r'bookings', BookingViewSet, basename='booking')

urlpatterns = [
    # Router paths (buses, bookings)
    path('api/', include(router.urls)),
    
    # Authentication paths
    path('api/login/', obtain_auth_token, name='api_token_auth'),
    path('api/register/', RegisterView.as_view(), name='api_register'),
]