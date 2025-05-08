// WaData User Directory - Main Application JavaScript

// Configuration
const CONFIG = {
    itemsPerPage: 12,
    defaultAvatar: "img/avatar-placeholder.png",
    
    // Animation settings
    animations: {
        enable: true,
        duration: 300
    }
};

// Application state
const state = {
    users: [], 
    filteredUsers: [],
    currentPage: 1,
    
    // Preserve filters between sessions
    filters: {
        search: '',
        role: 'all',
        status: 'all',
        saveToStorage: function() {
            localStorage.setItem('wadata_filters', JSON.stringify({
                search: this.search,
                role: this.role,
                status: this.status
            }));
        },
        loadFromStorage: function() {
            const stored = localStorage.getItem('wadata_filters');
            if (stored) {
                try {
                    const data = JSON.parse(stored);
                    this.search = data.search || '';
                    this.role = data.role || 'all';
                    this.status = data.status || 'all';
                    return true;
                } catch (e) {
                    console.error("Error loading filters:", e);
                    return false;
                }
            }
            return false;
        }
    }
};

// DOM elements
const elements = {
    // Main content
    mainContent: document.getElementById('main-content'),
    userGrid: document.getElementById('user-grid'),
    
    // Filters
    searchInput: document.getElementById('search'),
    roleFilter: document.getElementById('role-filter'),
    statusFilter: document.getElementById('status-filter'),
    applyFiltersBtn: document.getElementById('apply-filters'),
    
    // Stats
    totalUsers: document.getElementById('total-users'),
    dataChamps: document.getElementById('data-champs'),
    customers: document.getElementById('customers'),
    newUsers: document.getElementById('new-users'),
    
    // Results info
    shownCount: document.getElementById('shown-count'),
    totalCount: document.getElementById('total-count'),
    
    // Pagination
    prevPageBtn: document.getElementById('prev-page'),
    nextPageBtn: document.getElementById('next-page'),
    pageNumbers: document.getElementById('page-numbers'),
    
    // Loading indicator
    loading: document.getElementById('loading'),
    
    // Modal
    userModal: document.getElementById('user-modal'),
    closeModal: document.getElementById('close-modal'),
    modalContent: document.getElementById('modal-content')
};

// Initialize the application
function init() {
    // Set up event listeners
    setupEventListeners();
    
    // Try to load saved filters
    if (state.filters.loadFromStorage()) {
        // Apply loaded filters to UI
        elements.searchInput.value = state.filters.search;
        elements.roleFilter.value = state.filters.role;
        elements.statusFilter.value = state.filters.status;
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Filters
    elements.applyFiltersBtn.addEventListener('click', applyFilters);
    elements.searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            applyFilters();
        }
    });
    
    // Reset filters
    const resetFiltersBtn = document.getElementById('reset-filters');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetFilters);
    }
    
    // Pagination
    elements.prevPageBtn.addEventListener('click', () => changePage(state.currentPage - 1));
    elements.nextPageBtn.addEventListener('click', () => changePage(state.currentPage + 1));
    
    // Modal
    elements.closeModal.addEventListener('click', closeUserModal);
    window.addEventListener('click', function(e) {
        if (e.target === elements.userModal) {
            closeUserModal();
        }
    });
    
    // Listen for auth events from auth.js
    document.addEventListener('app:load', loadUsers);
}

// Load users from WordPress
async function loadUsers() {
    // Show loading indicator
    elements.loading.classList.remove('hidden');
    elements.userGrid.innerHTML = '';
    
    try {
        // Fetch users using the WordPress service
        state.users = await window.WaDataUsers.fetchUsers();
        
        // Calculate stats
        const stats = window.WaDataUsers.calculateStats(state.users);
        
        // Update stats displays
        elements.totalUsers.textContent = stats.total;
        elements.dataChamps.textContent = stats.roles['Data Champ'];
        elements.customers.textContent = stats.roles['Customer'];
        elements.newUsers.textContent = stats.newThisMonth;
        
        // Apply filters (initially show all)
        applyFilters();
    } catch (error) {
        console.error('Error loading users:', error);
        elements.userGrid.innerHTML = `
            <div class="col-span-full py-10 text-center">
                <p class="text-red-500 text-lg">Error loading users</p>
                <p class="text-gray-600 mt-2">${error.message}</p>
                <button id="retry-button" class="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                    Retry
                </button>
            </div>`;
        
        // Add retry button handler
        document.getElementById('retry-button')?.addEventListener('click', loadUsers);
    } finally {
        // Hide loading indicator
        elements.loading.classList.add('hidden');
    }
}

// Update the stats display
function updateStats() {
    const stats = calculateStats(state.users);
    elements.totalUsers.textContent = stats.total;
    elements.dataChamps.textContent = stats.dataChamps;
    elements.customers.textContent = stats.customers;
    elements.newUsers.textContent = stats.newThisMonth;
}

// Calculate stats from user data
function calculateStats(users) {
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    const stats = {
        total: users.length,
        dataChamps: users.filter(user => user.role === 'Data Champ').length,
        customers: users.filter(user => user.role === 'Customer').length,
        newThisMonth: users.filter(user => {
            const regDate = new Date(user.registeredDate);
            return regDate >= firstDayOfMonth;
        }).length
    };
    
    return stats;
}

// Apply filters to the user list
function applyFilters() {
    const searchTerm = elements.searchInput.value.toLowerCase();
    const roleFilter = elements.roleFilter.value;
    const statusFilter = elements.statusFilter.value;
    
    // Update state
    state.filters.search = searchTerm;
    state.filters.role = roleFilter;
    state.filters.status = statusFilter;
    
    // Save filters to storage
    state.filters.saveToStorage();
    
    // Filter users
    state.filteredUsers = state.users.filter(user => {
        // Search by name or email
        const matchesSearch = 
            user.username.toLowerCase().includes(searchTerm) || 
            user.email.toLowerCase().includes(searchTerm) ||
            (user.firstName + ' ' + user.lastName).toLowerCase().includes(searchTerm);
        
        // Filter by role
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        
        // Filter by status
        const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
        
        return matchesSearch && matchesRole && matchesStatus;
    });
    
    // Reset to first page
    state.currentPage = 1;
    
    // Update display
    updateResults();
    renderPagination();
    renderUsers();
}

// Update the results count
function updateResults() {
    elements.totalCount.textContent = state.filteredUsers.length;
    const start = (state.currentPage - 1) * CONFIG.itemsPerPage;
    const end = Math.min(start + CONFIG.itemsPerPage, state.filteredUsers.length);
    elements.shownCount.textContent = end - start;
}

// Render the user grid
function renderUsers() {
    const start = (state.currentPage - 1) * CONFIG.itemsPerPage;
    const end = Math.min(start + CONFIG.itemsPerPage, state.filteredUsers.length);
    const usersToShow = state.filteredUsers.slice(start, end);
    
    // Clear the grid
    elements.userGrid.innerHTML = '';
    
    if (usersToShow.length === 0) {
        elements.userGrid.innerHTML = `
            <div class="col-span-full py-10 text-center">
                <p class="text-gray-500 text-lg">No users match your search criteria</p>
                <button id="reset-filters" class="mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded">
                    Reset Filters
                </button>
            </div>
        `;
        
        document.getElementById('reset-filters').addEventListener('click', resetFilters);
        return;
    }
    
    // Add user cards
    usersToShow.forEach(user => {
        const card = createUserCard(user);
        elements.userGrid.appendChild(card);
        
        // Apply entrance animation if enabled
        if (CONFIG.animations.enable) {
            setTimeout(() => {
                card.classList.add('opacity-100', 'translate-y-0');
            }, 50);
        }
    });
}

// Create a user card element
function createUserCard(user) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow';
    
    // Add animation classes if enabled
    if (CONFIG.animations.enable) {
        card.classList.add('opacity-0', 'translate-y-4', 'transition-all', 'duration-300');
    }
    
    // Generate avatar URL or use provided one
    const avatarUrl = user.avatar || `${CONFIG.defaultAvatar}`;
    
    // Determine status badge style
    let statusClass = 'status-approved';
    if (user.status === 'Pending' || user.status === 'Pending administrator review') {
        statusClass = 'status-pending';
    } else if (user.status === 'Waiting email confirmation') {
        statusClass = 'status-waiting';
    }
    
    card.innerHTML = `
        <div class="relative">
            <div class="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            <div class="absolute -bottom-12 left-0 w-full flex justify-center">
                <img src="${avatarUrl}" alt="${user.firstName} ${user.lastName}" 
                     class="w-24 h-24 rounded-full border-4 border-white"
                     onerror="this.src='${CONFIG.defaultAvatar}';">
            </div>
        </div>
        <div class="pt-14 px-4 pb-5">
            <div class="text-center">
                <h3 class="text-xl font-semibold">${user.firstName} ${user.lastName}</h3>
                <p class="text-gray-600 text-sm">${user.username}</p>
                <div class="flex justify-center mt-2">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${statusClass}">
                        ${user.status}
                    </span>
                </div>
            </div>
            <div class="mt-4 space-y-2 text-sm">
                <div class="flex">
                    <i class="fas fa-user-tag text-gray-500 w-5"></i>
                    <span class="text-gray-700">${user.role}</span>
                </div>
                <div class="flex">
                    <i class="fas fa-envelope text-gray-500 w-5"></i>
                    <span class="text-gray-700 truncate">${user.email}</span>
                </div>
                <div class="flex">
                    <i class="fas fa-calendar text-gray-500 w-5"></i>
                    <span class="text-gray-700">Joined: ${formatDate(user.registeredDate)}</span>
                </div>
            </div>
            <div class="mt-5 text-center">
                <button class="view-user-details text-blue-600 hover:text-blue-800 text-sm font-medium" 
                        data-user-id="${user.id}">
                    View Details
                </button>
            </div>
        </div>
    `;
    
    // Add click handler for the view details button
    card.querySelector('.view-user-details').addEventListener('click', () => {
        showUserDetails(user);
    });
    
    return card;
}

// Show user details in modal
function showUserDetails(user) {
    // Fill the modal content
    elements.modalContent.innerHTML = `
        <div class="flex flex-col md:flex-row">
            <div class="md:w-1/3 flex justify-center">
                <img src="${user.avatar || CONFIG.defaultAvatar}" 
                     alt="${user.firstName} ${user.lastName}" 
                     class="w-32 h-32 rounded-full"
                     onerror="this.src='${CONFIG.defaultAvatar}';">
            </div>
            <div class="md:w-2/3 mt-4 md:mt-0">
                <h3 class="text-2xl font-semibold">${user.firstName} ${user.lastName}</h3>
                <p class="text-gray-500">${user.username}</p>
                
                <div class="mt-3 flex items-center">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${user.status === 'Approved' ? 'status-approved' : (user.status === 'Waiting email confirmation' ? 'status-waiting' : 'status-pending')}">
                        ${user.status}
                    </span>
                    <span class="ml-2 text-gray-600 text-sm">${user.role}</span>
                </div>
                
                <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                        <p class="font-medium text-gray-500">Email</p>
                        <p class="text-gray-800">${user.email}</p>
                    </div>
                    <div>
                        <p class="font-medium text-gray-500">Registration Date</p>
                        <p class="text-gray-800">${formatDate(user.registeredDate)}</p>
                    </div>
                    <div>
                        <p class="font-medium text-gray-500">Specialization</p>
                        <p class="text-gray-800">${user.specialization || 'Not specified'}</p>
                    </div>
                    <div>
                        <p class="font-medium text-gray-500">Location</p>
                        <p class="text-gray-800">${user.location || 'Not specified'}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="mt-6 pt-6 border-t border-gray-200">
            <h4 class="font-medium text-lg">Skills & Expertise</h4>
            <p class="mt-2 text-gray-700">${user.skills || 'No skills listed'}</p>
        </div>
        
        <div class="mt-4">
            <h4 class="font-medium text-lg">Biography</h4>
            <p class="mt-2 text-gray-700">${user.bio || 'No biography available'}</p>
        </div>
        
        <div class="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <h4 class="font-medium text-lg">Contact Information</h4>
                <div class="mt-2 space-y-2">
                    <div class="flex items-center">
                        <i class="fas fa-envelope text-gray-500 w-6"></i>
                        <span class="text-gray-700">${user.email}</span>
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-phone text-gray-500 w-6"></i>
                        <span class="text-gray-700">${user.phone || 'Not provided'}</span>
                    </div>
                </div>
            </div>
            <div>
                <h4 class="font-medium text-lg">Social Profiles</h4>
                <div class="mt-2 space-y-2">
                    ${user.linkedin ? `
                    <div class="flex items-center">
                        <i class="fab fa-linkedin text-gray-500 w-6"></i>
                        <a href="${user.linkedin}" target="_blank" class="text-blue-600 hover:underline">LinkedIn Profile</a>
                    </div>
                    ` : ''}
                    ${user.portfolio ? `
                    <div class="flex items-center">
                        <i class="fas fa-globe text-gray-500 w-6"></i>
                        <a href="${user.portfolio}" target="_blank" class="text-blue-600 hover:underline">Portfolio Website</a>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    // Show the modal
    elements.userModal.style.display = 'block';
    
    // Add animation if enabled
    if (CONFIG.animations.enable) {
        const modalContent = elements.userModal.querySelector('.modal-content');
        modalContent.classList.add('scale-95', 'opacity-0', 'transition-all', 'duration-300');
        
        setTimeout(() => {
            modalContent.classList.remove('scale-95', 'opacity-0');
            modalContent.classList.add('scale-100', 'opacity-100');
        }, 10);
    }
}

// Close the user details modal
function closeUserModal() {
    if (CONFIG.animations.enable) {
        const modalContent = elements.userModal.querySelector('.modal-content');
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        
        setTimeout(() => {
            elements.userModal.style.display = 'none';
        }, CONFIG.animations.duration);
    } else {
        elements.userModal.style.display = 'none';
    }
}

// Render pagination
function renderPagination() {
    const totalPages = Math.ceil(state.filteredUsers.length / CONFIG.itemsPerPage);
    
    // Update button states
    elements.prevPageBtn.disabled = state.currentPage <= 1;
    elements.nextPageBtn.disabled = state.currentPage >= totalPages;
    
    // Clear page numbers
    elements.pageNumbers.innerHTML = '';
    
    // Don't show page numbers if there's only one page
    if (totalPages <= 1) {
        return;
    }
    
    // Determine which page numbers to show
    let startPage = Math.max(1, state.currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    // Adjust if we're near the end
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    // Add first page button if not already included
    if (startPage > 1) {
        addPageButton(1);
        if (startPage > 2) {
            addEllipsis();
        }
    }
    
    // Add page number buttons
    for (let i = startPage; i <= endPage; i++) {
        addPageButton(i);
    }
    
    // Add last page button if not already included
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            addEllipsis();
        }
        addPageButton(totalPages);
    }
}

// Add a page number button
function addPageButton(pageNum) {
    const button = document.createElement('button');
    button.className = `px-4 py-2 text-sm font-medium border border-gray-300 ${
        pageNum === state.currentPage
            ? 'bg-blue-600 text-white border-blue-600'
            : 'text-gray-700 bg-white hover:bg-gray-50'
    }`;
    button.textContent = pageNum;
    button.addEventListener('click', () => changePage(pageNum));
    elements.pageNumbers.appendChild(button);
}

// Add ellipsis for pagination
function addEllipsis() {
    const span = document.createElement('span');
    span.className = 'px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 bg-white';
    span.textContent = '...';
    elements.pageNumbers.appendChild(span);
}

// Change the current page
function changePage(pageNum) {
    state.currentPage = pageNum;
    renderUsers();
    updateResults();
    renderPagination();
    
    // Scroll to top of grid
    elements.userGrid.scrollIntoView({ behavior: 'smooth' });
}

// Reset all filters
function resetFilters() {
    elements.searchInput.value = '';
    elements.roleFilter.value = 'all';
    elements.statusFilter.value = 'all';
    applyFilters();
}

// Format date for display
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Initialize the application when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    init();
    loadUsers(); // Load users when page loads after authentication is set up
});