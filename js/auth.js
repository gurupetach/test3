// WaData User Directory - WordPress Authentication Module

// Authentication functions for WordPress REST API
const Auth = {
    // Get authentication header for WordPress API
    getAuthHeader: function() {
        // Use credentials from config.js
        const username = window.WaDataConfig.wpUsername;
        const password = window.WaDataConfig.wpAppPassword;
        
        // Create a Basic auth header with base64 encoded credentials
        return 'Basic ' + btoa(username + ':' + password);
    },
    
    // Fetch data from WordPress with authentication
    fetchFromWordPress: async function(endpoint, params = {}) {
        // Build the URL with query parameters
        const queryString = new URLSearchParams(params).toString();
        const url = `${window.WaDataConfig.apiBase}/${endpoint}${queryString ? '?' + queryString : ''}`;
        
        try {
            // Make the authenticated request
            const response = await fetch(url, {
                headers: {
                    'Authorization': this.getAuthHeader(),
                    'Content-Type': 'application/json'
                }
            });
            
            // Handle HTTP errors
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error (${response.status}): ${errorText}`);
            }
            
            // Parse and return the JSON response
            return await response.json();
        } catch (error) {
            console.error('Error fetching from WordPress:', error);
            throw error;
        }
    },
    
    // Test the authentication
    testAuthentication: async function() {
        try {
            // Try to get current user (a simple endpoint that requires auth)
            const response = await this.fetchFromWordPress('users/me');
            console.log('Authentication successful:', response.name);
            return true;
        } catch (error) {
            console.error('Authentication failed:', error.message);
            return false;
        }
    },
    
    // Get a specific user by ID
    getUser: async function(userId) {
        try {
            return await this.fetchFromWordPress(`users/${userId}`, {
                context: 'edit'
            });
        } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
            throw error;
        }
    },
    
    // Get a batch of users
    getUsers: async function(page = 1, perPage = 100) {
        try {
            return await this.fetchFromWordPress('users', {
                page: page,
                per_page: perPage,
                context: 'edit',
                _fields: 'id,username,name,email,registered_date,roles,meta,avatar_urls'
            });
        } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
        }
    },
    
    // Get user meta fields for a specific user
    getUserMeta: async function(userId) {
        try {
            const user = await this.getUser(userId);
            return user.meta || {};
        } catch (error) {
            console.error(`Error fetching meta for user ${userId}:`, error);
            throw error;
        }
    },
    
    // Convert WordPress roles to friendly names
    getFriendlyRole: function(roles) {
        if (!roles || !Array.isArray(roles) || roles.length === 0) {
            return 'Subscriber';
        }
        
        // Check roles in priority order
        if (roles.includes('administrator')) return 'Administrator';
        if (roles.includes('data_champ')) return 'Data Champ';
        if (roles.includes('customer')) return 'Customer';
        if (roles.includes('account_manager')) return 'Account Manager';
        if (roles.includes('editor')) return 'Editor';
        if (roles.includes('author')) return 'Author';
        if (roles.includes('contributor')) return 'Contributor';
        
        return 'Subscriber';
    }
};

// When the script loads, check if we have valid configuration
document.addEventListener('DOMContentLoaded', function() {
    if (!window.WaDataConfig) {
        console.error('WaData configuration not found. Make sure config.js is loaded before auth.js');
    } else {
        console.log('WaData authentication module initialized');
    }
});

// Make Auth available globally
window.WaDataAuth = Auth;