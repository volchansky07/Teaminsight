export interface JwtPayload {
  sub: string; 
  email: string;
  systemRole: 'USER' | 'SUPER_ADMIN';
  organizationRole?: 'OWNER' | 'MANAGER' | 'EMPLOYEE'; 
  org?: string | null; 
  exp?: number; 
}

export function parseJwt(token: string): JwtPayload | null {
    try {
        const base64Payload = token.split('.')[1]; 
        const payload = atob(base64Payload);
        return JSON.parse(payload);
    }  catch {
        return null;        
    }
}