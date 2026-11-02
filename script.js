const SUPABASE_URL = 'https://jmfxrkmvriefrulivley.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptZnhya212cmllZnJ1bGl2bGV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjM1OTgzMywiZXhwIjoyMTAxOTM1ODMzfQ.T2bn16_KraZtIM86ByJDRiVALoLpwN3yZGe7lBifLc4'; 

const DISCORD_CLIENT_ID = '1414051513600573440'; 
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1562446612503076914/FYkHX7-xGku0iNxFhEB8KZ9oggADPAKR1GaKnXtxz5gByWs-Zk-9ZWdeqMCPyLhZBIIg';
const REDIRECT_URI = window.location.origin + window.location.pathname;

let dbClient = null;
try {
    dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (e) {
    console.error('Supabase error:', e);
}

let currentDate = new Date();
let currentFilter = 'all';
let activeEventId = null;
let events = [];

/* Snow Animation Setup */
const canvas = document.getElementById('snow-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let flakes = [];
let animFrameId = null;

function resizeSnowCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeSnowCanvas);
resizeSnowCanvas();

function createFlakes() {
    flakes = [];
    if (!canvas) return;
    const flakeCount = Math.floor(window.innerWidth / 12);
    for (let i = 0; i < flakeCount; i++) {
        flakes.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 3 + 1,
            d: Math.random() * 1 + 0.5,
            opacity: Math.random() * 0.7 + 0.3
        });
    }
}

function drawSnow() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    
    for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        ctx.moveTo(f.x, f.y);
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2, true);
    }
    ctx.fill();
    updateSnow();
    animFrameId = requestAnimationFrame(drawSnow);
}

function updateSnow() {
    if (!canvas) return;
    for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        f.y += Math.pow(f.d, 2) + 0.8;
        f.x += Math.sin(f.y / 30) * 0.5;

        if (f.y > canvas.height) {
            flakes[i] = {
                x: Math.random() * canvas.width,
                y: -10,
                r: f.r,
                d: f.d,
                opacity: f.opacity
            };
        }
    }
}

function startSnow() {
    if (!animFrameId && canvas) {
        createFlakes();
        drawSnow();
    }
}

function stopSnow() {
    if (animFrameId && ctx && canvas) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

const categoryColors = {
    truckfest: '#1CC8FA',
    convoy: '#3498DB',
    charity: '#E74C3C',
    utl_own: '#9B59B6',
    custom_vtc: '#F1C40F'
};

const categoryEmojis = {
    truckfest: '🎪',
    convoy: '🚛',
    charity: '❤️',
    utl_own: '🌟',
    custom_vtc: '🎨'
};

window.loginWithDiscord = function() {
    const scope = encodeURIComponent('identify guilds guilds.members.read');
    const redirect = encodeURIComponent(REDIRECT_URI);
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirect}&response_type=token&scope=${scope}`;
    window.location.href = authUrl;
};

async function handleDiscordCallback() {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragment.get('access_token');

    if (accessToken) {
        window.history.replaceState({}, document.title, window.location.pathname);
        localStorage.setItem('discord_access_token', accessToken);
    }

    const token = localStorage.getItem('discord_access_token');
    if (!token) return;

    try {
        const userRes = await fetch('https://discord.com/api/v10/users/@me', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!userRes.ok) throw new Error('Failed user fetch');
        const userData = await userRes.json();

        const userName = userData.global_name || userData.username;
        localStorage.setItem('utl_user_name', userName);
        localStorage.setItem('utl_discord_id', userData.id);

        const btnText = document.getElementById('discord-btn-text');
        if (btnText) btnText.innerText = userName;

        if (dbClient) {
            const { data: staffData, error: staffError } = await dbClient
                .from('authorized_staff')
                .select('*')
                .eq('user_id', userData.id)
                .single();

            if (staffData && !staffError) {
                localStorage.setItem('utl_staff_unlocked', 'true');
            } else {
                localStorage.removeItem('utl_staff_unlocked');
            }
        }
    } catch (err) {
        console.error('Discord auth error:', err);
    }

    updateAuthUI();
}

function updateAuthUI() {
    const userName = localStorage.getItem('utl_user_name');
    const isStaff = localStorage.getItem('utl_staff_unlocked') === 'true';

    const btnText = document.getElementById('discord-btn-text');
    const logoutBtn = document.getElementById('staff-logout-btn');
    const staffActions = document.getElementById('staff-actions-container');
    const rosterBox = document.getElementById('staff-rsvp-breakdown-box');

    if (userName && btnText) {
        btnText.innerText = `👤 ${userName}`;
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
    } else if (btnText) {
        btnText.innerText = 'Login with Discord';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }

    if (isStaff) {
        if (staffActions) staffActions.style.display = 'flex';
        if (rosterBox) rosterBox.style.display = 'block';
    } else {
        if (staffActions) staffActions.style.display = 'none';
        if (rosterBox) rosterBox.style.display = 'none';
    }
}

window.openManagementModal = function() {
    const isStaff = localStorage.getItem('utl_staff_unlocked') === 'true';
    if (!isStaff) {
        alert('❌ Access denied. You must be logged in with a Discord account holding the Management or Events Team role.');
        return;
    }

    const form = document.getElementById('event-form');
    if (form) form.reset();
    document.getElementById('edit-event-id').value = '';
    document.getElementById('management-modal-title').innerText = '⚙️ Events Team Control Panel (Publish)';
    document.getElementById('form-submit-btn').innerText = 'Publish Event';

    const modal = document.getElementById('management-modal');
    if (modal) modal.classList.add('active');
};

window.openEditEventModal = function() {
    const evt = events.find(e => e.id === activeEventId);
    if (!evt) return;

    closeModal('event-modal');

    document.getElementById('edit-event-id').value = evt.id;
    document.getElementById('evt-title').value = evt.title;
    document.getElementById('evt-type').value = evt.type;
    
    if (evt.date) {
        document.getElementById('evt-date').value = evt.date.slice(0, 16);
    }

    document.getElementById('evt-server').value = evt.server || '';
    document.getElementById('evt-route').value = evt.route || '';
    document.getElementById('evt-desc').value = evt.description || '';
    document.getElementById('evt-img-url').value = evt.routeImage || '';
    document.getElementById('evt-slot-images').value = Array.isArray(evt.slotImages) ? evt.slotImages.join(', ') : '';

    document.getElementById('management-modal-title').innerText = '✏️ Edit Event: ' + evt.title;
    document.getElementById('form-submit-btn').innerText = 'Save Changes';

    const modal = document.getElementById('management-modal');
    if (modal) modal.classList.add('active');
};

window.logoutDiscord = function() {
    localStorage.removeItem('discord_access_token');
    localStorage.removeItem('utl_user_name');
    localStorage.removeItem('utl_discord_id');
    localStorage.removeItem('utl_staff_unlocked');
    updateAuthUI();
    alert('🔒 Logged out.');
};

async function fetchEvents() {
    if (!dbClient) {
        renderCalendar();
        return;
    }

    try {
        const { data, error } = await dbClient
            .from('utl_events')
            .select('*')
            .order('event_date', { ascending: true });

        if (!error && data) {
            events = data.map(e => ({
                id: e.id,
                title: e.title,
                type: e.event_type,
                date: e.event_date,
                server: e.server,
                route: e.route,
                description: e.description || '',
                routeImage: e.route_image || '',
                slotImages: Array.isArray(e.slot_images) ? e.slot_images : [],
                bookedVtcs: Array.isArray(e.booked_vtcs) ? e.booked_vtcs : [],
                rsvps: e.rsvps || { attending: 0, unsure: 0, declined: 0 },
                driverRsvps: e.driver_rsvps || {}
            }));
        }
    } catch (err) {
        console.error('Fetch error:', err);
    }
    renderCalendar();
}

window.renderCalendar = function() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    if (month === 11) {
        document.body.classList.add('theme-december');
        startSnow();
    } else {
        document.body.classList.remove('theme-december');
        stopSnow();
    }

    const monthLabel = document.getElementById('current-month-label');
    if (monthLabel) monthLabel.innerText = `${monthNames[month]} ${year}`;
    
    const grid = document.getElementById('calendar-days-grid');
    if (grid) {
        grid.innerHTML = '';
        const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
        const totalDays = new Date(year, month + 1, 0).getDate();

        const todayObj = new Date();
        const isCurrentMonthYear = (todayObj.getFullYear() === year && todayObj.getMonth() === month);
        const currentDayNum = todayObj.getDate();

        for (let i = 0; i < firstDayIndex; i++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell other-month';
            grid.appendChild(cell);
        }

        for (let day = 1; day <= totalDays; day++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell';
            
            if (isCurrentMonthYear && day === currentDayNum) {
                cell.classList.add('today');
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            let cellContent = `<span class="cell-number">${day}</span>`;

            if (month === 11) {
                if (day === 25) cellContent += `<div class="holiday-badge badge-xmas">🎄 Christmas Day</div>`;
                else if (day === 26) cellContent += `<div class="holiday-badge badge-boxing">🎁 Boxing Day</div>`;
                else if (day === 31) cellContent += `<div class="holiday-badge badge-NYE">🎆 New Year's Eve</div>`;
            }

            cell.innerHTML = cellContent;

            const dayEvents = events.filter(e => e.date && e.date.startsWith(dateStr) && (currentFilter === 'all' || e.type === currentFilter));
            
            dayEvents.forEach(evt => {
                const chip = document.createElement('div');
                chip.className = 'event-chip';
                chip.style.backgroundColor = categoryColors[evt.type] || '#1CC8FA';
                chip.style.color = '#0f0a1e';
                
                const emoji = categoryEmojis[evt.type] || '🚛';
                chip.innerHTML = `<span>${emoji}</span><span>${evt.title}</span>`;
                chip.onclick = () => openEventModal(evt.id);
                cell.appendChild(chip);
            });

            grid.appendChild(cell);
        }
    }

    const sidebarList = document.getElementById('sidebar-events-list');
    const countBadge = document.getElementById('event-count-badge');
    
    if (sidebarList) {
        sidebarList.innerHTML = '';
        const filteredAllEvents = events.filter(e => currentFilter === 'all' || e.type === currentFilter);
        if (countBadge) countBadge.innerText = `(${filteredAllEvents.length})`;

        if (filteredAllEvents.length === 0) {
            sidebarList.innerHTML = `<p style="font-size:12px; color:var(--text-dim); text-align:center; padding: 10px;">No events found on the calendar.</p>`;
        } else {
            filteredAllEvents.forEach(evt => {
                const item = document.createElement('div');
                item.className = 'overview-event-item';
                item.onclick = () => {
                    if (evt.date) {
                        const evtDate = new Date(evt.date);
                        if (evtDate.getFullYear() !== currentDate.getFullYear() || evtDate.getMonth() !== currentDate.getMonth()) {
                            currentDate = new Date(evtDate.getFullYear(), evtDate.getMonth(), 1);
                            renderCalendar();
                        }
                    }
                    openEventModal(evt.id);
                };
                
                const dateObj = new Date(evt.date);
                const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                const emoji = categoryEmojis[evt.type] || '🚛';

                item.innerHTML = `
                    <div class="overview-title">${emoji} ${evt.title}</div>
                    <div class="overview-meta">
                        <span>📅 ${formattedDate}</span>
                        <span>🖥️ ${evt.server}</span>
                    </div>
                `;
                sidebarList.appendChild(item);
            });
        }
    }
};

window.prevMonth = function() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
};

window.nextMonth = function() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
};

window.filterEvents = function(type, btnEvent) {
    currentFilter = type;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    if (btnEvent && btnEvent.target) {
        btnEvent.target.classList.add('active');
    }
    renderCalendar();
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
};

window.openLightbox = function(imgSrc) {
    const lightbox = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    if (lightbox && lightboxImg) {
        lightboxImg.src = imgSrc;
        lightbox.classList.add('active');
    }
};

window.openSlotBookingModal = function() {
    console.log("Opening slot booking modal for event ID:", activeEventId);
    const evt = events.find(e => e.id === activeEventId);
    if (!evt) {
        alert("⚠️ Active event reference not found.");
        return;
    }

    const titleEl = document.getElementById('slot-modal-title');
    if (titleEl) titleEl.innerText = `🎟️ Convoy Slots: ${evt.title}`;
    
    const standardSlots = [
        "Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5", 
        "Slot 6", "Slot 7", "Slot 8", "Slot 9", "Slot 10",
        "F7 / Repair Shop Area", "Non-VTC / Public Overflow"
    ];

    const bookedVtcs = Array.isArray(evt.bookedVtcs) ? evt.bookedVtcs : [];
    const bookedSlotChoices = bookedVtcs.map(b => b.slotChoice);
    const availableSlots = standardSlots.filter(slot => !bookedSlotChoices.includes(slot));

    const bannerBody = document.getElementById('available-slots-list-body');
    if (bannerBody) {
        if (availableSlots.length > 0) {
            bannerBody.innerHTML = availableSlots.map(s => `<span class="slot-pill-tag">📍 ${s}</span>`).join(' ');
        } else {
            bannerBody.innerHTML = `<span style="color:var(--danger); font-size:12px; font-weight:bold;">All standard slots have been reserved for this convoy!</span>`;
        }
    }

    const slotDropdown = document.getElementById('slot-vtc-choice');
    if (slotDropdown) {
        slotDropdown.innerHTML = `<option value="">-- Choose an Available Slot --</option>`;
        availableSlots.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.innerText = s;
            slotDropdown.appendChild(opt);
        });

        const customOpt = document.createElement('option');
        customOpt.value = "Custom / Other Slot";
        customOpt.innerText = "➕ Other / Custom Slot Area";
        slotDropdown.appendChild(customOpt);
    }

    const container = document.getElementById('slot-maps-display-container');
    if (container) {
        container.innerHTML = '';
        const validSlotImages = Array.isArray(evt.slotImages) 
            ? evt.slotImages.map(img => String(img || '')).filter(img => img.trim().length > 0) 
            : [];

        if (validSlotImages.length > 0) {
            validSlotImages.forEach((imgUrl, index) => {
                const cleanUrl = imgUrl.trim();
                const mapDiv = document.createElement('div');
                mapDiv.style.marginBottom = '15px';
                mapDiv.innerHTML = `
                    <p style="font-size: 13px; font-weight: bold; color: var(--primary-blue);">📍 Slot Option / Area Map #${index + 1}</p>
                    <img src="${cleanUrl}" style="max-width:100%; max-height:220px; border-radius:6px; border:1px solid var(--primary-blue); cursor:pointer;" onclick="openLightbox('${cleanUrl}')" title="Click to enlarge slot map">
                `;
                container.appendChild(mapDiv);
            });
        } else {
            container.innerHTML = `<p style="font-size: 13px; color: var(--text-dim);">No custom slot maps uploaded for this convoy yet.</p>`;
        }
    }

    const form = document.getElementById('slot-booking-form');
    if (form) form.reset();
    
    closeModal('event-modal');
    const slotModal = document.getElementById('slot-booking-modal');
    if (slotModal) slotModal.classList.add('active');
};

window.submitSlotBooking = async function(e) {
    e.preventDefault();
    const evt = events.find(e => e.id === activeEventId);
    if (!evt) return;

    const vtcName = document.getElementById('slot-vtc-name').value.trim();
    const vtcLogo = document.getElementById('slot-vtc-logo').value.trim();
    const vtcLink = document.getElementById('slot-vtc-link').value.trim();
    const slotChoice = document.getElementById('slot-vtc-choice').value;
    const drivers = document.getElementById('slot-vtc-drivers').value.trim();
    const discordUser = document.getElementById('slot-vtc-discord').value.trim();
    const position = document.getElementById('slot-vtc-position').value.trim();

    if (!slotChoice) {
        alert('⚠️ Please select a slot from the available options dropdown list.');
        return;
    }

    const newBooking = {
        vtcName: vtcName,
        vtcLogo: vtcLogo,
        vtcLink: vtcLink,
        slotChoice: slotChoice,
        drivers: drivers,
        discordUser: discordUser,
        position: position,
        bookedAt: new Date().toISOString()
    };

    const updatedBookedVtcs = Array.isArray(evt.bookedVtcs) ? [...evt.bookedVtcs, newBooking] : [newBooking];

    if (dbClient) {
        await dbClient
            .from('utl_events')
            .update({ booked_vtcs: updatedBookedVtcs })
            .eq('id', evt.id);
    }

    const payload = {
        username: "UTL Convoy Slot Booking Bot",
        avatar_url: "https://i.imgur.com/86k1z0Z.png",
        embeds: [
            {
                title: "🎟️ New VTC Convoy Slot Booking!",
                color: 1870842,
                fields: [
                    { name: "Convoy Event", value: evt.title, inline: false },
                    { name: "VTC Company", value: vtcName, inline: true },
                    { name: "Chosen Slot", value: slotChoice, inline: true },
                    { name: "Estimated Drivers", value: drivers, inline: true },
                    { name: "VTC HaulMP Link", value: vtcLink, inline: false },
                    { name: "Contact Person", value: `${discordUser} (${position})`, inline: true }
                ],
                thumbnail: { url: vtcLogo },
                footer: { text: "Universal Transport Ltd Event Management" },
                timestamp: new Date().toISOString()
            }
        ]
    };

    try {
        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error('Webhook error:', err);
    }

    alert('🎉 Success! Your slot booking has been submitted and confirmed.');
    closeModal('slot-booking-modal');
    await fetchEvents();
    openEventModal(evt.id);
};

window.removeBookedVtc = async function(indexToRemove) {
    const isStaff = localStorage.getItem('utl_staff_unlocked') === 'true';
    if (!isStaff) return;

    const evt = events.find(e => e.id === activeEventId);
    if (!evt || !Array.isArray(evt.bookedVtcs)) return;

    if (!confirm(`Are you sure you want to cancel the booking for "${evt.bookedVtcs[indexToRemove].vtcName}"?`)) return;

    evt.bookedVtcs.splice(indexToRemove, 1);

    if (dbClient) {
        await dbClient
            .from('utl_events')
            .update({ booked_vtcs: evt.bookedVtcs })
            .eq('id', evt.id);
    }

    openEventModal(activeEventId);
    renderCalendar();
};

window.triggerDiscordReminder = function() {
    const evt = events.find(e => e.id === activeEventId);
    if (!evt) return;

    const discordId = localStorage.getItem('utl_discord_id');
    const userName = localStorage.getItem('utl_user_name');

    if (!discordId) {
        alert('⚠️ Please click "Login with Discord" in the header so Universal Bot knows which Discord account to DM!');
        loginWithDiscord();
        return;
    }

    alert(`🔔 Reminder requested for ${userName}!\n\nOur Discord Bot will send a DM reminder to your account prior to the launch of "${evt.title}".`);
};

window.handleEventSubmit = async function(e) {
    e.preventDefault();
    if (!dbClient) {
        alert('Supabase is not configured.');
        return;
    }

    const editId = document.getElementById('edit-event-id').value;
    const imageUrl = document.getElementById('evt-img-url').value.trim();
    const slotImagesRaw = document.getElementById('evt-slot-images').value.trim();
    const slotImages = slotImagesRaw ? slotImagesRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    const title = document.getElementById('evt-title').value;
    const type = document.getElementById('evt-type').value;
    const date = document.getElementById('evt-date').value;
    const server = document.getElementById('evt-server').value;
    const route = document.getElementById('evt-route').value;
    const desc = document.getElementById('evt-desc').value;

    let error = null;

    if (editId) {
        const updatePayload = {
            title: title,
            event_type: type,
            event_date: date,
            server: server,
            route: route,
            description: desc,
            route_image: imageUrl,
            slot_images: slotImages
        };

        const res = await dbClient
            .from('utl_events')
            .update(updatePayload)
            .eq('id', editId);
        error = res.error;
    } else {
        const res = await dbClient
            .from('utl_events')
            .insert({
                title: title,
                event_type: type,
                event_date: date,
                server: server,
                route: route,
                description: desc,
                route_image: imageUrl,
                slot_images: slotImages,
                booked_vtcs: [],
                rsvps: { attending: 0, unsure: 0, declined: 0 },
                driver_rsvps: {}
            });
        error = res.error;
    }

    if (!error) {
        closeModal('management-modal');
        document.getElementById('event-form').reset();
        fetchEvents();
    } else {
        alert('Failed to save event: ' + error.message);
    }
};

window.deleteCurrentEvent = async function() {
    if (!activeEventId || !dbClient) return;
    if (!confirm('Are you sure you want to delete this event?')) return;

    const { error } = await dbClient
        .from('utl_events')
        .delete()
        .eq('id', activeEventId);

    if (!error) {
        closeModal('event-modal');
        fetchEvents();
    } else {
        alert('Failed to delete event: ' + error.message);
    }
};

function formatDescription(text) {
    if (!text) return '';
    
    let escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    escaped = escaped.replace(/(\*\*)?\[([^\]]+)\]\s*\(\s*([\s\S]*?)\s*\)(\*\*|[^\w]|$)/g, function(match, boldStart, textContent, url, boldEnd) {
        const cleanUrl = url.replace(/<br\s*[\/]?>/gi, '').replace(/\s+/g, '').replace(/&amp;/g, '&');
        let innerText = textContent.replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1');
        const isBold = boldStart || (boldEnd && boldEnd.includes('**')) || textContent.includes('**');
        const display = isBold ? `<strong>${innerText}</strong>` : textContent;

        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--primary-blue); text-decoration: underline; word-break: break-all;">${display}</a>`;
    });

    escaped = escaped.replace(/(https?:\/\/[^\s<"]+)/g, function(url) {
        if (url.includes('href=')) return url;
        const cleanUrl = url.replace(/&quot;|["']/g, '').replace(/&amp;/g, '&');
        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--primary-blue); text-decoration: underline; word-break: break-all;">${cleanUrl}</a>`;
    });

    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/__(.*?)__/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
    escaped = escaped.replace(/_(.*?)_/g, '<em>$1</em>');
    escaped = escaped.replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/g, '<u>$1</u>');
    escaped = escaped.replace(/\n/g, '<br>');

    return escaped;
}

window.removeRsvpUser = async function(driverName) {
    const isStaff = localStorage.getItem('utl_staff_unlocked') === 'true';
    if (!isStaff) return;

    const evt = events.find(e => e.id === activeEventId);
    if (!evt || !evt.driverRsvps) return;

    const currentStatus = evt.driverRsvps[driverName];
    if (currentStatus) {
        evt.rsvps[currentStatus] = Math.max(0, (evt.rsvps[currentStatus] || 1) - 1);
        delete evt.driverRsvps[driverName];
    }

    if (dbClient) {
        await dbClient
            .from('utl_events')
            .update({ rsvps: evt.rsvps, driver_rsvps: evt.driverRsvps })
            .eq('id', evt.id);
    }

    openEventModal(activeEventId);
    renderCalendar();
};

function openEventModal(eventId) {
    activeEventId = eventId;
    const evt = events.find(e => e.id === eventId);
    if (!evt) return;

    const userName = localStorage.getItem('utl_user_name');
    const isStaff = localStorage.getItem('utl_staff_unlocked') === 'true';
    const statusLabel = document.getElementById('rsvp-status-label');
    const slotBookingBtnContainer = document.getElementById('utl-slot-booking-btn-container');
    const bookedVtcsCard = document.getElementById('utl-booked-vtcs-container');
    const bookedVtcsBody = document.getElementById('booked-vtcs-list-body');
    const bookedVtcsCountTag = document.getElementById('booked-vtc-count-tag');

    const bookedVtcsList = Array.isArray(evt.bookedVtcs) ? evt.bookedVtcs : [];

    if (evt.type === 'utl_own') {
        if (slotBookingBtnContainer) slotBookingBtnContainer.style.display = 'block';
        if (bookedVtcsCard) bookedVtcsCard.style.display = 'block';
        if (bookedVtcsCountTag) bookedVtcsCountTag.innerText = `(${bookedVtcsList.length})`;

        if (bookedVtcsBody) {
            if (bookedVtcsList.length === 0) {
                bookedVtcsBody.innerHTML = `<p style="font-size:12px; color:var(--text-dim); text-align:center; padding: 6px;">No VTCs have booked a slot yet.</p>`;
            } else {
                bookedVtcsBody.innerHTML = bookedVtcsList.map(item => `
                    <div class="booked-vtc-item">
                        <div class="booked-vtc-info">
                            <img src="${item.vtcLogo}" class="booked-vtc-logo" onerror="this.src='https://i.imgur.com/86k1z0Z.png'">
                            <div>
                                <a href="${item.vtcLink || '#'}" target="_blank" style="color:var(--text-light); font-weight:bold; text-decoration:none;">${item.vtcName}</a>
                                <span style="color:var(--text-dim); font-size:11px;"> (${item.drivers || '?'} Drivers)</span>
                            </div>
                        </div>
                        <div style="font-weight:bold; color:var(--primary-blue); font-size:12px;">
                            📍 ${item.slotChoice}
                        </div>
                    </div>
                `).join('');
            }
        }
    } else {
        if (slotBookingBtnContainer) slotBookingBtnContainer.style.display = 'none';
        if (bookedVtcsCard) bookedVtcsCard.style.display = 'none';
    }
    
    if (userName && statusLabel) {
        statusLabel.innerHTML = `Your RSVP Status (<span style="color:var(--primary-blue);">${userName}</span>)`;
    } else if (statusLabel) {
        statusLabel.innerHTML = `Your RSVP Status <span style="color:var(--warning); font-size:11px;">(⚠️ Login with Discord to RSVP)</span>`;
    }

    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) modalTitle.innerText = evt.title;
    
    let imgHTML = evt.routeImage 
        ? `<div style="margin-bottom:15px; text-align:center;">
             <img src="${evt.routeImage}" style="max-width:100%; max-height:220px; border-radius:8px; cursor:pointer;" onclick="openLightbox('${evt.routeImage}')" title="Click to enlarge route map">
             <p style="font-size:11px; color:var(--text-dim); margin-top:4px;">🔍 Click image to enlarge route map</p>
           </div>` 
        : '';

    let descHTML = evt.description 
        ? `<div style="margin-bottom: 12px; background: var(--bg-dark); padding: 10px; border-radius: 6px; font-size: 13px; color: var(--text-dim); word-break: break-word; overflow-wrap: break-word; white-space: pre-wrap;"><strong>📝 Description:</strong><br>${formatDescription(evt.description)}</div>`
        : '';

    const modalBody = document.getElementById('modal-body');
    if (modalBody) {
        modalBody.innerHTML = `
            ${imgHTML}
            <p style="margin-bottom: 8px;"><strong>📅 Date & Time:</strong> ${new Date(evt.date).toLocaleString('en-GB')}</p>
            <p style="margin-bottom: 8px;"><strong>🖥️ Server:</strong> ${evt.server}</p>
            <p style="margin-bottom: 8px;"><strong>🗺️ Route:</strong> ${evt.route}</p>
            ${descHTML}
            <div style="display:flex; flex-wrap:wrap; gap:12px; margin-top:15px; font-size:13px; color:var(--text-dim);">
                <span>✅ Attending: <strong>${evt.rsvps.attending}</strong></span>
                <span>❓ Unsure: <strong>${evt.rsvps.unsure}</strong></span>
                <span>❌ Unable: <strong>${evt.rsvps.declined}</strong></span>
            </div>
        `;
    }

    const attendingList = [];
    const unsureList = [];
    const declinedList = [];

    if (evt.driverRsvps) {
        Object.entries(evt.driverRsvps).forEach(([driverName, status]) => {
            if (status === 'attending') attendingList.push(driverName);
            if (status === 'unsure') unsureList.push(driverName);
            if (status === 'declined') declinedList.push(driverName);
        });
    }

    const formatRosterList = (list) => {
        if (list.length === 0) return 'None';
        if (!isStaff) return list.join(', ');
        return list.map(name => `<span class="rsvp-user-pill">${name} <button onclick="removeRsvpUser('${name.replace(/'/g, "\\'")}')" title="Remove RSVP">×</button></span>`).join(' ');
    };

    const formatVtcRosterList = (list) => {
        if (list.length === 0) return 'None';
        if (!isStaff) return list.map(v => v.vtcName).join(', ');
        return list.map((v, idx) => `<span class="rsvp-user-pill">${v.vtcName} (${v.slotChoice}) <button onclick="removeBookedVtc(${idx})" title="Cancel VTC Booking">×</button></span>`).join(' ');
    };

    const breakdownVtcs = document.getElementById('breakdown-vtcs');
    const breakdownAttending = document.getElementById('breakdown-attending');
    const breakdownUnsure = document.getElementById('breakdown-unsure');
    const breakdownDeclined = document.getElementById('breakdown-declined');

    if (breakdownVtcs) breakdownVtcs.innerHTML = `🚛 <strong>Booked VTCs (${bookedVtcsList.length}):</strong> ${formatVtcRosterList(bookedVtcsList)}`;
    if (breakdownAttending) breakdownAttending.innerHTML = `✅ <strong>Attending (${attendingList.length}):</strong> ${formatRosterList(attendingList)}`;
    if (breakdownUnsure) breakdownUnsure.innerHTML = `❓ <strong>Unsure (${unsureList.length}):</strong> ${formatRosterList(unsureList)}`;
    if (breakdownDeclined) breakdownDeclined.innerHTML = `❌ <strong>Unable (${declinedList.length}):</strong> ${formatRosterList(declinedList)}`;

    document.querySelectorAll('.rsvp-btn').forEach(b => b.classList.remove('active'));
    
    const userRsvp = userName && evt.driverRsvps ? evt.driverRsvps[userName] : null;
    if (userRsvp) {
        if (userRsvp === 'attending') document.getElementById('rsvp-yes')?.classList.add('active');
        if (userRsvp === 'unsure') document.getElementById('rsvp-maybe')?.classList.add('active');
        if (userRsvp === 'declined') document.getElementById('rsvp-no')?.classList.add('active');
    }

    updateAuthUI();

    const modal = document.getElementById('event-modal');
    if (modal) modal.classList.add('active');
}

window.setRSVP = async function(status) {
    const userName = localStorage.getItem('utl_user_name');
    if (!userName) {
        alert('⚠️ Please click "Login with Discord" in the top header first!');
        loginWithDiscord();
        return;
    }

    const evt = events.find(e => e.id === activeEventId);
    if (!evt || !dbClient) return;

    if (!evt.driverRsvps) evt.driverRsvps = {};
    const previousStatus = evt.driverRsvps[userName];

    if (previousStatus) {
        evt.rsvps[previousStatus] = Math.max(0, evt.rsvps[previousStatus] - 1);
    }

    if (previousStatus === status) {
        delete evt.driverRsvps[userName];
    } else {
        evt.driverRsvps[userName] = status;
        evt.rsvps[status] = (evt.rsvps[status] || 0) + 1;
    }

    await dbClient
        .from('utl_events')
        .update({ rsvps: evt.rsvps, driver_rsvps: evt.driverRsvps })
        .eq('id', evt.id);

    openEventModal(activeEventId);
    renderCalendar();
};

handleDiscordCallback();
renderCalendar(); 
fetchEvents();
