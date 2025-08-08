import { getAuthenticatedUser, verifyAdminRole, verifyDistributorRole } from '../config/supabase.js';
import { AuthenticationError, AuthorizationError } from './errorHandler.js';

/**
 * Middleware to require authentication
 * Extracts user from JWT token in Authorization header
 */
export const requireAuth = async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);
    
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return res.status(401).json({
        success: false,
        error: {
          message: error.message,
          code: 'AUTHENTICATION_REQUIRED'
        }
      });
    }
    
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Authentication service error',
        code: 'AUTH_SERVICE_ERROR'
      }
    });
  }
};

/**
 * Middleware to require admin role
 * Must be used after requireAuth
 */
export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    const isAdmin = await verifyAdminRole(req.user.id);
    
    if (!isAdmin) {
      throw new AuthorizationError('Admin access required');
    }

    req.user.role = 'admin';
    next();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return res.status(403).json({
        success: false,
        error: {
          message: error.message,
          code: 'ADMIN_ACCESS_REQUIRED'
        }
      });
    }

    console.error('Admin authorization error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Authorization service error',
        code: 'AUTH_SERVICE_ERROR'
      }
    });
  }
};

/**
 * Middleware to require distributor role
 * Must be used after requireAuth
 */
export const requireDistributor = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    const distributorInfo = await verifyDistributorRole(req.user.id);
    
    if (!distributorInfo) {
      throw new AuthorizationError('Distributor access required or distributor not approved');
    }

    req.user.role = 'distributor';
    req.user.distributorId = distributorInfo.id;
    req.user.distributorStatus = distributorInfo.status;
    next();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return res.status(403).json({
        success: false,
        error: {
          message: error.message,
          code: 'DISTRIBUTOR_ACCESS_REQUIRED'
        }
      });
    }

    console.error('Distributor authorization error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Authorization service error',
        code: 'AUTH_SERVICE_ERROR'
      }
    });
  }
};

/**
 * Middleware to require admin OR distributor role
 * Must be used after requireAuth
 */
export const requireAdminOrDistributor = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Check admin first
    const isAdmin = await verifyAdminRole(req.user.id);
    if (isAdmin) {
      req.user.role = 'admin';
      return next();
    }

    // Check distributor
    const distributorInfo = await verifyDistributorRole(req.user.id);
    if (distributorInfo) {
      req.user.role = 'distributor';
      req.user.distributorId = distributorInfo.id;
      req.user.distributorStatus = distributorInfo.status;
      return next();
    }

    throw new AuthorizationError('Admin or distributor access required');
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return res.status(403).json({
        success: false,
        error: {
          message: error.message,
          code: 'ELEVATED_ACCESS_REQUIRED'
        }
      });
    }

    console.error('Role authorization error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Authorization service error',
        code: 'AUTH_SERVICE_ERROR'
      }
    });
  }
};

/**
 * Optional authentication middleware
 * Adds user to request if authenticated, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (user) {
      req.user = user;
    }
    next();
  } catch (error) {
    // Continue without authentication - this is optional
    console.warn('Optional auth failed:', error.message);
    next();
  }
};

/**
 * Middleware to extract distributor from params and verify ownership
 * Used for routes like /api/distributor/:distributorId/...
 */
export const requireDistributorOwnership = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    const { distributorId } = req.params;
    
    if (!distributorId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Distributor ID required',
          code: 'MISSING_DISTRIBUTOR_ID'
        }
      });
    }

    // Allow admins to access any distributor
    const isAdmin = await verifyAdminRole(req.user.id);
    if (isAdmin) {
      req.user.role = 'admin';
      return next();
    }

    // For non-admins, verify they own the distributor
    const distributorInfo = await verifyDistributorRole(req.user.id);
    if (!distributorInfo || distributorInfo.id !== distributorId) {
      throw new AuthorizationError('Can only access your own distributor data');
    }

    req.user.role = 'distributor';
    req.user.distributorId = distributorInfo.id;
    req.user.distributorStatus = distributorInfo.status;
    next();
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return res.status(error instanceof AuthenticationError ? 401 : 403).json({
        success: false,
        error: {
          message: error.message,
          code: error instanceof AuthenticationError ? 'AUTHENTICATION_REQUIRED' : 'ACCESS_DENIED'
        }
      });
    }

    console.error('Distributor ownership verification error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Authorization service error',
        code: 'AUTH_SERVICE_ERROR'
      }
    });
  }
};

/**
 * Middleware to validate Supabase JWT token structure
 * Used for debugging authentication issues
 */
export const validateTokenStructure = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authorization header missing',
        code: 'MISSING_AUTH_HEADER'
      }
    });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid authorization format. Expected: Bearer <token>',
        code: 'INVALID_AUTH_FORMAT'
      }
    });
  }

  const token = authHeader.substring(7);
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Token missing from authorization header',
        code: 'MISSING_TOKEN'
      }
    });
  }

  // Basic JWT format validation (should have 3 parts separated by dots)
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid JWT token format',
        code: 'INVALID_TOKEN_FORMAT'
      }
    });
  }

  next();
};

export default {
  requireAuth,
  requireAdmin,
  requireDistributor,
  requireAdminOrDistributor,
  optionalAuth,
  requireDistributorOwnership,
  validateTokenStructure
};