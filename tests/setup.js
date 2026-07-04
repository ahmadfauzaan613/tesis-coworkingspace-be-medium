// Ensure a fixed JWT secret before any app module is imported, so tokens
// signed in tests match what authMiddleware/authController verify with.
process.env.JWT_SECRET = 'test_secret_for_unit_tests';
