/**
 * RBAC Middleware Usage Examples
 * This file demonstrates how to use the various RBAC middleware functions
 * in your Express.js routes for role-based access control.
 */

const express = require('express');
const {
    authorizeAny,
    authorizeAll,
    requireRole,
    requireAdmin,
    requireOwnershipOrAdmin,
    requireMinimumRole
} = require('../middlewares/rbac.middleware');

const router = express.Router();

// Example role hierarchy (from lowest to highest permissions)
const ROLE_HIERARCHY = ['user', 'moderator', 'admin', 'super_admin'];

/**
 * Example 1: authorizeAny - User needs ANY of the specified roles
 * Use case: Content that can be accessed by either moderators OR admins
 */
router.get('/moderate-content', 
    authorizeAny(['moderator', 'admin']), 
    (req, res) => {
        res.json({ message: 'Content accessible by moderators or admins' });
    }
);

/**
 * Example 2: authorizeAll - User needs ALL of the specified roles
 * Use case: Special operations requiring multiple role permissions
 */
router.post('/special-operation', 
    authorizeAll(['moderator', 'verified_user']), 
    (req, res) => {
        res.json({ message: 'Operation requiring both moderator and verified_user roles' });
    }
);

/**
 * Example 3: requireRole - User needs a specific single role
 * Use case: Admin-only operations
 */
router.delete('/delete-user/:id', 
    requireRole('admin'), 
    (req, res) => {
        res.json({ message: `User ${req.params.id} deleted by admin` });
    }
);

/**
 * Example 4: requireAdmin - Shorthand for admin role
 * Use case: Admin dashboard access
 */
router.get('/admin-dashboard', 
    requireAdmin(), 
    (req, res) => {
        res.json({ message: 'Admin dashboard data' });
    }
);

/**
 * Example 5: requireOwnershipOrAdmin - User owns resource OR is admin
 * Use case: User profile updates (users can update their own profile, admins can update any)
 */
router.put('/user/:id/profile', 
    requireOwnershipOrAdmin('id', 'id'), // resourceIdParam, userIdField
    (req, res) => {
        res.json({ message: `Profile updated for user ${req.params.id}` });
    }
);

// Alternative ownership example with different parameter names
router.put('/post/:postId/edit', 
    requireOwnershipOrAdmin('postId', 'userId'), // if user object has userId field
    (req, res) => {
        res.json({ message: `Post ${req.params.postId} updated` });
    }
);

/**
 * Example 6: requireMinimumRole - Role hierarchy based access
 * Use case: Features that require at least moderator level access
 */
router.post('/moderate-post', 
    requireMinimumRole(ROLE_HIERARCHY, 'moderator'), 
    (req, res) => {
        res.json({ message: 'Post moderated (accessible by moderator, admin, or super_admin)' });
    }
);

// Another hierarchy example - only high-level admins
router.post('/system-config', 
    requireMinimumRole(ROLE_HIERARCHY, 'admin'), 
    (req, res) => {
        res.json({ message: 'System configuration updated (admin or super_admin only)' });
    }
);

/**
 * Example 7: Combining multiple middleware
 * Use case: Complex permission requirements
 */
router.post('/complex-operation', 
    requireRole('verified_user'), // First check if user is verified
    authorizeAny(['moderator', 'premium_user']), // Then check if they have elevated permissions
    (req, res) => {
        res.json({ message: 'Complex operation completed' });
    }
);

/**
 * Example 8: Different roles for different HTTP methods on same route
 */
router.route('/sensitive-data')
    .get(authorizeAny(['user', 'moderator', 'admin'])) // Anyone can read
    .post(requireRole('moderator')) // Only moderators can create
    .put(requireRole('admin')) // Only admins can update
    .delete(requireAdmin()); // Only admins can delete

/**
 * Example 9: Public route (no RBAC middleware)
 * Use case: Public content that doesn't require authentication
 */
router.get('/public-content', (req, res) => {
    res.json({ message: 'This is public content' });
});

/**
 * Example 10: Error handling middleware (should be added after routes)
 */
router.use((error, req, res, next) => {
    if (error.name === 'AuthorizationError') {
        return res.status(403).json({
            error: 'Access denied: insufficient permissions',
            success: false
        });
    }
    next(error);
});

module.exports = router;

/**
 * Usage Notes:
 * 
 * 1. Make sure req.user is populated by authentication middleware before RBAC
 * 2. req.user should have a 'roles' array property
 * 3. For ownership checks, ensure req.user has the specified user ID field
 * 4. Role hierarchy should be defined consistently across your application
 * 5. Always handle authorization errors appropriately
 * 
 * Example req.user object structure:
 * {
 *   id: '12345',
 *   email: 'user@example.com',
 *   roles: ['user', 'verified_user'],
 *   // other user properties...
 * }
 */