from django.contrib import admin
from .models import CustomUser

class CustomUserAdmin(admin.ModelAdmin):
    def get_groups(self, obj):
        return ", ".join([group.name for group in obj.groups.all()])

    get_groups.short_description = 'Groups'

    class Meta:
        exclude = ('password', 'last_login', 'is_superuser')

    get_groups.short_description = 'Groups'
    get_groups.admin_order_field = 'groups__name'


admin.site.register(CustomUser, CustomUserAdmin)
# Register your models here.
