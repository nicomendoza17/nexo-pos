export function can(user, permission) {
    if (!user?.permissions) return false;
    return user.permissions.includes(permission);
}

export function canAny(user, permissions) {
    if (!user?.permissions) return false;
    return permissions.some((p) => user.permissions.includes(p));
}