import { Hono } from 'hono';
import type { AppEnv } from '../context';
import * as ctrl from './controllers';
import { requireAdmin, requireCustomer } from './middleware';

export const authRoutes = new Hono<AppEnv>();

authRoutes.post('/admin/login', ctrl.adminLoginController);
authRoutes.post('/admin/logout', ctrl.adminLogoutController);
authRoutes.get('/admin/me', requireAdmin, ctrl.adminMeController);

authRoutes.post('/customers/register', ctrl.customerRegisterController);
authRoutes.post('/customers/login', ctrl.customerLoginController);
authRoutes.post('/customers/logout', ctrl.customerLogoutController);
authRoutes.get('/customers/me', requireCustomer, ctrl.customerMeController);
