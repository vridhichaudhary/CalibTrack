import logging
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.contrib.auth import get_user_model
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer,
    UserCreateSerializer,
    ChangePasswordSerializer,
)
from .permissions import IsAdminRole

from rest_framework.throttling import AnonRateThrottle

logger = logging.getLogger(__name__)
User = get_user_model()

class LoginRateThrottle(AnonRateThrottle):
    """
    Stricter rate limit specifically for login attempts —
    5 per minute per IP address — to slow down brute-force
    password guessing attempts without affecting normal usage
    of other read endpoints.
    """
    scope = 'login'


class LoginView(TokenObtainPairView):
    """
    POST /api/v1/auth/login/
    Accepts username and password.
    Returns access token, refresh token, and user info.
    No authentication required.
    """
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        logger.info(f"Successful login: {serializer.validated_data['user']['username']}")

        return Response({
            'success': True,
            'data': {
                'access': serializer.validated_data['access'],
                'refresh': serializer.validated_data['refresh'],
                'user': serializer.validated_data['user'],
            }
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/
    Blacklists the refresh token so it cannot be reused.
    Requires authentication.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({
                'success': False,
                'error': 'Refresh token is required.'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            logger.info(f"User logged out: {request.user.username}")
            return Response({
                'success': True,
                'message': 'Successfully logged out.'
            }, status=status.HTTP_200_OK)
        except TokenError:
            return Response({
                'success': False,
                'error': 'Invalid or expired token.'
            }, status=status.HTTP_400_BAD_REQUEST)


class TokenRefreshView(TokenRefreshView):
    """
    POST /api/v1/auth/token/refresh/
    Accepts a refresh token, returns a new access token.
    Uses token rotation — old refresh token is blacklisted,
    new one is issued automatically.
    """
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        return Response({
            'success': True,
            'data': response.data
        }, status=response.status_code)


class MeView(APIView):
    """
    GET /api/v1/auth/me/
    Returns the currently authenticated user's profile.
    Used by frontend to verify token and load user data on app start.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)


class UserListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/auth/users/   — Admin only: list all users
    POST /api/v1/auth/users/   — Admin only: create a new user
    """
    permission_classes = [IsAdminRole]
    serializer_class = UserCreateSerializer

    def get_queryset(self):
        return User.objects.filter(is_active=True).order_by('-date_joined')

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return UserSerializer
        return UserCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        logger.info(f"New user created: {user.username} by admin {request.user.username}")
        return Response({
            'success': True,
            'message': 'User created successfully.',
            'data': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = UserSerializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/auth/users/<id>/  — Admin only
    PATCH  /api/v1/auth/users/<id>/  — Admin only: update user
    DELETE /api/v1/auth/users/<id>/  — Admin only: deactivate user (soft)
    """
    permission_classes = [IsAdminRole]
    serializer_class = UserSerializer

    def get_queryset(self):
        return User.objects.all()

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=['is_active'])
        logger.info(f"User deactivated: {user.username} by {request.user.username}")
        return Response({
            'success': True,
            'message': f'User {user.username} has been deactivated.'
        }, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """
    POST /api/v1/auth/change-password/
    Allows any authenticated user to change their own password.
    Old password must be verified before new one is accepted.
    After password change, the user's refresh token should be
    discarded on the frontend and they should log in again.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        logger.info(f"Password changed for user: {request.user.username}")
        return Response({
            'success': True,
            'message': 'Password changed successfully. Please log in again.'
        }, status=status.HTTP_200_OK)
