var TMI = TMI || {};

TMI.regStatusKey = 'tmi_registrations_open';
TMI.registrations = [];

TMI.roleBadgeConfig = {
    'organizer': { label: 'Organizer', color: '#8b5cf6', bg: '#f5f3ff' },
    'team-builder': { label: 'Team Builder', color: '#2563eb', bg: '#eff6ff' },
    'hacker': { label: 'Hacker', color: '#059669', bg: '#ecfdf5' },
    'sponsor': { label: 'Sponsor', color: '#d97706', bg: '#fffbeb' },
};

TMI.getRegStatus = function() {
    return localStorage.getItem(TMI.regStatusKey) !== 'false';
};

TMI.setRegStatus = function(open) {
    localStorage.setItem(TMI.regStatusKey, open);
};

TMI.isRegOpen = function() {
    return TMI.getRegStatus();
};

TMI.updateRegBadge = function() {
    var badge = document.getElementById('regStatusBadge');
    if (!badge) return;
    var isOpen = TMI.isRegOpen();
    var dot = document.getElementById('regStatusDot');
    var text = document.getElementById('regStatusText');
    if (dot) dot.className = 'reg-status-dot ' + (isOpen ? 'open' : 'closed');
    if (text) text.textContent = isOpen ? 'Registrations Open' : 'Registrations Closed';
};

TMI.fetchRegistrations = function() {
    return fetch('/api/registrations')
        .then(function(r) { return r.json(); })
        .then(function(resp) {
            if (resp.success && resp.data) {
                TMI.registrations = resp.data;
            }
            return TMI.registrations;
        })
        .catch(function(err) {
            console.error('Failed to fetch registrations:', err);
            return [];
        });
};

TMI.getRoleConfig = function(role) {
    return TMI.roleBadgeConfig[role] || null;
};

TMI.applyRoleBadge = function(avatarEl, role) {
    if (!avatarEl) return;
    var config = TMI.getRoleConfig(role);
    avatarEl.style.position = 'relative';
    avatarEl.style.borderColor = config ? config.color : '#ccc';
    var existing = avatarEl.querySelector('.role-badge');
    if (existing) existing.remove();
    if (config) {
        var badge = document.createElement('span');
        badge.className = 'role-badge';
        badge.textContent = config.label.charAt(0);
        badge.style.cssText = 'position:absolute;bottom:-2px;right:-2px;width:18px;height:18px;border-radius:50%;background:' + config.color + ';color:white;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.2)';
        avatarEl.appendChild(badge);
    }
};

TMI.getUserRole = function() {
    return localStorage.getItem('tmi_user_role') || 'hacker';
};

TMI.setUserRole = function(role) {
    localStorage.setItem('tmi_user_role', role);
};

TMI.getUserProfile = function() {
    return {
        name: localStorage.getItem('tmi_user_name') || 'Admin User',
        email: localStorage.getItem('tmi_user_email') || 'admin@example.com',
        role: TMI.getUserRole(),
        avatar: localStorage.getItem('tmi_user_avatar') || '',
    };
};

TMI.saveUserProfile = function(profile) {
    if (profile.name) localStorage.setItem('tmi_user_name', profile.name);
    if (profile.email) localStorage.setItem('tmi_user_email', profile.email);
    if (profile.role) localStorage.setItem('tmi_user_role', profile.role);
    if (profile.avatar !== undefined) localStorage.setItem('tmi_user_avatar', profile.avatar);
};

TMI.getAccessibilitySettings = function() {
    return {
        highContrast: localStorage.getItem('tmi_high_contrast') === 'true',
        reduceMotion: localStorage.getItem('tmi_reduce_motion') !== 'false',
        fontSize: localStorage.getItem('tmi_font_size') || 'normal',
    };
};

TMI.saveAccessibilitySettings = function(settings) {
    if (settings.highContrast !== undefined) localStorage.setItem('tmi_high_contrast', settings.highContrast);
    if (settings.reduceMotion !== undefined) localStorage.setItem('tmi_reduce_motion', settings.reduceMotion);
    if (settings.fontSize) localStorage.setItem('tmi_font_size', settings.fontSize);
    TMI.applyAccessibilitySettings();
};

TMI.applyAccessibilitySettings = function() {
    var settings = TMI.getAccessibilitySettings();
    if (settings.highContrast) {
        document.body.classList.add('high-contrast');
    } else {
        document.body.classList.remove('high-contrast');
    }
    if (!settings.reduceMotion) {
        document.body.classList.remove('reduce-motion');
    } else {
        document.body.classList.add('reduce-motion');
    }
    if (settings.fontSize === 'large') {
        document.body.classList.add('font-large');
    } else if (settings.fontSize === 'xlarge') {
        document.body.classList.add('font-xlarge');
    } else {
        document.body.classList.remove('font-large', 'font-xlarge');
    }
};

TMI.renderProfileAvatar = function(containerEl) {
    if (!containerEl) return;
    var profile = TMI.getUserProfile();
    containerEl.innerHTML = '';
    if (profile.avatar) {
        var img = document.createElement('img');
        img.src = profile.avatar;
        img.alt = profile.name;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
        containerEl.appendChild(img);
    } else {
        containerEl.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
    }
    TMI.applyRoleBadge(containerEl, profile.role);
};

function setActiveNav(el) {
    document.querySelectorAll('.nav-item').forEach(function(i) { i.classList.remove('active'); });
    if (el) el.classList.add('active');
}

function filterTable() {
    var q = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('#tableBody tr').forEach(function(row) { row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none'; });
}

function exportData() {
    var rows = TMI.registrations;
    if (!rows.length) { alert('No data to export.'); return; }
    var headers = ['firstName','lastName','email','teamName','hackathonTrack','province','status','createdAt'];
    var csv = headers.join(',') + '\n';
    rows.forEach(function(r) {
        var vals = headers.map(function(h) { return '"' + (r[h] || '').replace(/"/g, '""') + '"'; });
        csv += vals.join(',') + '\n';
    });
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'tmi-registrations.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function animateValue(id, start, end, dur) {
    var el = document.getElementById(id);
    if (!el) return;
    var range = end - start;
    var t0 = performance.now();
    (function step(now) {
        var p = Math.min((now - t0) / dur, 1);
        el.textContent = Math.floor(start + range * p).toLocaleString();
        if (p < 1) requestAnimationFrame(step);
    })(t0);
}

TMI.formatDate = function(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    return d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
};

TMI.getProvince = function(r) {
    return r.state || r.province || '-';
};

TMI.getFullName = function(r) {
    return (r.firstName || '') + ' ' + (r.lastName || '');
};

TMI.getStatusBadge = function(r) {
    var status = r.status || 'Pending';
    var cls = status === 'Approved' ? 'status-approved' : 'status-pending';
    return '<span class="status-badge ' + cls + '">' + status + '</span>';
};

(function() {
    TMI.updateRegBadge();
    TMI.applyAccessibilitySettings();
    TMI.fetchRegistrations();
})();
