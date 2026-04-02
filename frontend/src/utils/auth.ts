export interface JwtPayload {
  sub: string;
  email: string;
  role?: 'SUPER_ADMIN' | 'OWNER' | 'MANAGER' | 'EMPLOYEE';
  systemRole?: 'SUPER_ADMIN';
  organizationRole?: 'OWNER' | 'MANAGER' | 'EMPLOYEE';
  organizationId?: string | null;
  org?: string | null;
  mustChangePassword?: boolean;
  exp?: number;
}

export function parseJwt(token: string): JwtPayload | null {
  try {
    const base64Payload = token.split('.')[1];
    const payload = atob(base64Payload);
    return JSON.parse(payload);
  } catch {
    return null;
  }
}