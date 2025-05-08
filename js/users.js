// js/users.js - WordPress user data service

// User data service
const UserService = {
    // Fetch all users from WordPress
    fetchUsers: async function() {
      try {
        // Get users with their meta fields
        const users = await window.WaDataAuth.fetchFromWordPress('users', {
          context: 'edit',
          per_page: 100,
          _fields: 'id,username,name,email,registered_date,roles,meta'
        });
        
        // Transform WordPress user data to our app format
        return users.map(user => {
          // Determine role
          let role = 'Subscriber';
          if (user.roles.includes('data_champ')) role = 'Data Champ';
          else if (user.roles.includes('customer')) role = 'Customer';
          else if (user.roles.includes('administrator')) role = 'Administrator';
          else if (user.roles.includes('account_manager')) role = 'Account Manager';
          
          // Get status from meta or default to Approved
          let status = 'Approved';
          if (user.meta && user.meta.account_status) {
            status = user.meta.account_status;
          }
          
          return {
            id: user.id,
            username: user.username || '',
            firstName: user.meta && user.meta.first_name ? user.meta.first_name : '',
            lastName: user.meta && user.meta.last_name ? user.meta.last_name : '',
            email: user.email,
            role: role,
            status: status,
            registeredDate: user.registered_date,
            specialization: user.meta && user.meta.specialization ? user.meta.specialization : '',
            location: user.meta && user.meta.location ? user.meta.location : '',
            skills: user.meta && user.meta.skills ? user.meta.skills : '',
            bio: user.meta && user.meta.description ? user.meta.description : '',
            phone: user.meta && user.meta.phone ? user.meta.phone : '',
            avatar: user.avatar_urls ? user.avatar_urls['96'] : 'img/avatar-placeholder.png'
          };
        });
      } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
    },
    
    // Calculate user statistics
    calculateStats: function(users) {
      // Total users
      const total = users.length;
      
      // Count by role
      const roleCounts = {
        'Data Champ': users.filter(u => u.role === 'Data Champ').length,
        'Customer': users.filter(u => u.role === 'Customer').length,
        'Administrator': users.filter(u => u.role === 'Administrator').length,
        'Account Manager': users.filter(u => u.role === 'Account Manager').length,
        'Subscriber': users.filter(u => u.role === 'Subscriber').length
      };
      
      // Calculate new users this month
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      
      const newUsersThisMonth = users.filter(user => {
        const regDate = new Date(user.registeredDate);
        return regDate >= firstDayOfMonth;
      }).length;
      
      return {
        total,
        roles: roleCounts,
        newThisMonth: newUsersThisMonth
      };
    }
  };
  
  // Make UserService available globally
  window.WaDataUsers = UserService;