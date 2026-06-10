from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """
    Grants access only to users whose role is 'admin'.
    Used on all endpoints that modify data:
    create instrument, upload report, manage recipients.
    """

    message = 'Access denied. Admin role required.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'admin'
        )


class IsUserRole(BasePermission):
    """
    Grants access to both admin and user roles.
    Used on read-only endpoints that all staff can see.
    """

    message = 'Access denied. Authentication required.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ['admin', 'user']
        )


class IsAdminOrReadOnly(BasePermission):
    """
    Admins can do everything.
    Authenticated users can only read (GET, HEAD, OPTIONS).
    Used on instrument list/detail endpoints.
    """

    SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS')
    message = 'Access denied. Admin role required for write operations.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in self.SAFE_METHODS:
            return True
        return request.user.role == 'admin'


class IsOwnerOrAdmin(BasePermission):
    """
    Object-level permission.
    Admins can access any object.
    Regular users can only access their own objects.
    """

    message = 'Access denied. You do not have permission to access this resource.'

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        if hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        return False
