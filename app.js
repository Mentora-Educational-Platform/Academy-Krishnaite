/**
 * Krishnaite Community Platform - Application Core
 * Dynamic State, Landing Page Navigation, View Routing, Tier Access Control, localStorage Persistence
 * Notion/Medium Style Rich Article Editor, Paste Handler, Slash Commands, Reading Mode
 */

// --- 1. SEED DATA ---
const INITIAL_POSTS = [];
const INITIAL_RESOURCES = [];
const INITIAL_ROADMAPS = [];
const INITIAL_NOTIFICATIONS = [];

const MOCK_PROFILES = {
  free: {
    email: "student@krishnaite.dev",
    name: "Mohan Das",
    role: "member",
    tier: "free",
    joinDate: "July 2026",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
    savedPostIds: [],
    commentHistory: [
      { text: "Thanks for the free templates!", date: "2 days ago", postTitle: "Welcome to Krishnaite community!" }
    ]
  },
  explorer: {
    email: "explorer@krishnaite.dev",
    name: "Ananth Kumar",
    role: "member",
    tier: "explorer",
    joinDate: "June 2026",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    savedPostIds: ["post-free-1"],
    commentHistory: [
      { text: "Building parsing engines from scratch changes how one views code formatting. Outstanding guide!", date: "1 day ago", postTitle: "Project Walkthrough: Custom Markdown Parser in JS" }
    ]
  },
  pro: {
    email: "prodev@krishnaite.dev",
    name: "Damodar Rao",
    role: "member",
    tier: "pro",
    joinDate: "May 2026",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80",
    savedPostIds: ["post-pro-1", "post-free-ann"],
    commentHistory: [
      { text: "The details on Tokio runtime queue management are exactly what I needed for our production refactor. Excellent writeup.", date: "5 hours ago", postTitle: "Deep Dive: Rust Concurrency Models vs Go Goroutines" }
    ]
  },
  founder: {
    email: "founder@krishnaite.dev",
    name: "Harshita",
    role: "founder",
    tier: "pro",
    joinDate: "January 2026",
    avatar: "assets/founder.png",
    savedPostIds: [],
    commentHistory: []
  }
};

// --- 2. APPLICATION STATE ---
let state = {
  posts: [],
  resources: [],
  roadmaps: [],
  notifications: [],
  profiles: {},
  currentUserRole: "free",
  activeView: "dashboard",
  editorDraft: null,
  userLoggedIn: false
};

// --- Supabase Client Initialization ---
const supabaseUrl = "https://jllutbamogrndaqexktk.supabase.co";
const supabaseKey = "sb_publishable_yjUbGDQcuxsomXpwoJ7jpQ_W03qyL4t";
window.client = supabase.createClient(supabaseUrl, supabaseKey);
const client = window.client;

// --- 3. STATE SYNC & INITIALIZATION ---
async function loadState() {
  const currentVersion = "krishnaite_profile_v11";
  if (localStorage.getItem("app_version") !== currentVersion) {
    localStorage.clear();
    localStorage.setItem("app_version", currentVersion);
  }

  // Get active session from Supabase
  const { data: { session } } = await client.auth.getSession();
  if (!session) {
    localStorage.removeItem("userLoggedIn");
    state.userLoggedIn = false;
    window.location.href = "index.html";
    return;
  }

  const stored = localStorage.getItem("krishnaite_state");
  if (stored) {
    try {
      state = JSON.parse(stored);
      if (!state.posts) state.posts = [];
      if (!state.resources) state.resources = [];
      if (!state.roadmaps) state.roadmaps = [];
      if (!state.notifications) state.notifications = [];
      if (!state.profiles) state.profiles = {};
      if (!state.editorDraft) state.editorDraft = null;
    } catch (e) {
      console.error("Error reading stored state. Seeding fresh data.", e);
      seedState();
    }
  } else {
    seedState();
  }

  // Dynamically resolve real user details from Supabase session
  const userEmail = session.user.email;
  const rawName = userEmail.split('@')[0];
  const formattedName = rawName.split(/[._-]/).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  
  let userRole = (userEmail === "founder@krishnaite.dev") ? "founder" : "free";
  state.isFounder = (userEmail === "founder@krishnaite.dev");
  let dbProfile = null;

  // Self-healing: Ensure user profile is registered in Supabase database profiles table
  try {
    const { data: profile } = await client.from("profiles").select("id, tier, role, preferred_language").eq("id", session.user.id).maybeSingle();
    dbProfile = profile;
    if (!profile) {
      const defaultTier = userEmail === "founder@krishnaite.dev" ? "pro" : "free";
      const { data: newProfile } = await client.from("profiles").insert([{
        id: session.user.id,
        email: userEmail,
        name: userEmail === "founder@krishnaite.dev" ? "Harshita" : formattedName,
        role: userEmail === "founder@krishnaite.dev" ? "founder" : "member",
        tier: defaultTier,
        avatar_url: userEmail === "founder@krishnaite.dev" ? "assets/founder.png" : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userEmail)}`
      }]).select().single();
      dbProfile = newProfile;
    }
  } catch (err) {
    console.warn("Could not sync profile to database:", err);
  }

  if (dbProfile) {
    userRole = dbProfile.tier || "free";

    // Keep founder privileges separately
    if (dbProfile.role === "founder") {
      state.isFounder = true;
    }
  }

  if (!state.profiles) state.profiles = {};
  
  state.profiles[userRole] = {
    email: userEmail,
    name: userEmail === "founder@krishnaite.dev" ? "Harshita" : formattedName,
    role: userEmail === "founder@krishnaite.dev" ? "founder" : "member",
    tier: userRole === "founder" ? "pro" : userRole,
    joinDate: state.profiles[userRole]?.joinDate || "July 2026",
    avatar: userEmail === "founder@krishnaite.dev" 
      ? "assets/founder.png" 
      : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userEmail)}`,
    savedPostIds: state.profiles[userRole]?.savedPostIds || [],
    commentHistory: state.profiles[userRole]?.commentHistory || []
  };

  state.currentUserRole = userRole;
  state.userLoggedIn = true;
  localStorage.setItem("userLoggedIn", "true");

  // Fetch real posts, resources, and roadmaps from Supabase database if tables exist
  try {
    const { data: postsData, error: postsErr } = await client.from("posts").select("*").order("created_at", { ascending: false });
    if (!postsErr && postsData) {
      state.posts = postsData.map(p => ({
        id: p.id,
        title: p.title,
        body: p.body,
        community: p.community,
        excerpt: p.excerpt || "",
        tags: p.tags || [],
        pinned: p.pinned || false,
        commentsEnabled: p.comments_enabled !== false,
        coverImage: p.cover_image,
        coverY: p.cover_y,
        likes: p.likes || [],
        comments: p.comments || [],
        createdAt: p.created_at,
        author: { name: "Harshita", email: "founder@krishnaite.dev", avatar: "assets/founder.png", role: "founder" }
      }));
    }

    const { data: roadmapsData, error: roadmapsErr } = await client.from("roadmaps").select("*").order("created_at", { ascending: true });
    if (!roadmapsErr && roadmapsData) {
      state.roadmaps = roadmapsData;
    }

    const { data: resourcesData, error: resourcesErr } = await client.from("resources").select("*").order("uploaded_at", { ascending: false });
    if (!resourcesErr && resourcesData) {
      state.resources = resourcesData.map(r => ({
        id: r.id,
        title: r.title,
        desc: r.description,
        category: r.category,
        cover: r.thumbnail || r.cover_image || "https://images.unsplash.com/photo-1618401471353-b98aedd07871?auto=format&fit=crop&w=400&q=80",
        url: r.file_url || r.access_url || r.external_link || "#",
        visibility: r.visibility || "free"
      }));
    }

    const { data: assetsData, error: assetsErr } = await client.from("assets").select("*").order("uploaded_at", { ascending: false });
    if (!assetsErr && assetsData) {
      state.assets = assetsData;
    }
  } catch (err) {
    console.warn("Could not sync with Supabase tables, using LocalStorage fallback:", err);
  }
  saveState();
}

function saveState() {
  localStorage.setItem("krishnaite_state", JSON.stringify(state));
}

async function loadMemberCount() {
  try {
    const { count, error } = await client
      .from("profiles")
      .select("id", { count: "exact", head: true });
    
    const countEl = document.getElementById("community-member-count");
    if (countEl) {
      countEl.textContent = (!error && count !== null) ? count : "—";
    }
  } catch (err) {
    const countEl = document.getElementById("community-member-count");
    if (countEl) countEl.textContent = "—";
  }
}

function seedState() {
  state.posts = [...INITIAL_POSTS];
  state.resources = [...INITIAL_RESOURCES];
  state.roadmaps = [...INITIAL_ROADMAPS];
  state.notifications = [...INITIAL_NOTIFICATIONS];
  state.profiles = JSON.parse(JSON.stringify(MOCK_PROFILES));
  state.currentUserRole = "free";
  state.activeView = "dashboard";
  state.editorDraft = null;
  state.userLoggedIn = false;
  saveState();
}

function getCurrentUser() {
  return state.profiles[state.currentUserRole];
}

// --- 4. VIEW ROUTER & NAVIGATION ---
const sidebarNavItems = document.querySelectorAll(".sidebar-nav-item");
const mainViewContent = document.getElementById("main-view-content");
const globalSearchInput = document.getElementById("global-search");
const headerCreatePostBtn = document.getElementById("header-create-post-btn");
const sidebarToggle = document.getElementById("sidebar-toggle");
const appSidebar = document.getElementById("app-sidebar");

const mainAppContainer = document.getElementById("main-app-container");
const editorView = document.getElementById("editor-view");

function initNavigation() {
  sidebarNavItems.forEach(item => {
    item.addEventListener("click", () => {
      const view = item.getAttribute("data-view");
      if (!view) return; // handles custom actions like logout click directly
      
      if (isViewLocked(view)) {
        renderUpgradeCard(view);
        setActiveNavItem(item);
        if (window.innerWidth <= 768) {
          appSidebar.classList.remove("open");
        }
        return;
      }
      
      state.activeView = view;
      saveState();
      
      setActiveNavItem(item);
      renderActiveView();
      
      if (window.innerWidth <= 768) {
        appSidebar.classList.remove("open");
      }
    });
  });

  sidebarToggle.addEventListener("click", () => {
    appSidebar.classList.toggle("open");
  });

  globalSearchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (query.length > 0) {
      renderSearchResults(query);
    } else {
      renderActiveView();
    }
  });

  headerCreatePostBtn.addEventListener("click", () => {
    openEditor();
  });
}

function isViewLocked(view) {
  const currentRole = state.currentUserRole;
  if (state.isFounder || currentRole === "pro") return false;
  
  if (view === "comm-explorer") {
    return currentRole === "free";
  }
  if (view === "comm-pro") {
    return currentRole === "free" || currentRole === "explorer";
  }
  return false;
}

function setActiveNavItem(activeItem) {
  sidebarNavItems.forEach(item => {
    item.classList.remove("active");
  });
  activeItem.classList.add("active");
}

function syncSidebarActiveState() {
  sidebarNavItems.forEach(item => {
    const view = item.getAttribute("data-view");
    if (view === state.activeView) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Sync locks visibility
  const explorerLock = document.getElementById("sidebar-lock-explorer");
  const proLock = document.getElementById("sidebar-lock-pro");
  if (explorerLock && proLock) {
    const role = state.currentUserRole;
    if (role === "free") {
      explorerLock.classList.remove("hidden");
      proLock.classList.remove("hidden");
    } else if (role === "explorer") {
      explorerLock.classList.add("hidden");
      proLock.classList.remove("hidden");
    } else {
      explorerLock.classList.add("hidden");
      proLock.classList.add("hidden");
    }
  }
}

// --- 5. RENDER SYSTEM ---
function renderActiveView() {
  if (!state.userLoggedIn) {
    window.location.href = "index.html";
    return;
  }

  mainAppContainer.classList.remove("hidden");
  editorView.classList.add("hidden");

  syncSidebarActiveState();
  
  if (globalSearchInput.value && document.activeElement !== globalSearchInput) {
    globalSearchInput.value = "";
  }
  
  if (state.isFounder) {
    headerCreatePostBtn.classList.remove("hidden");
  } else {
    headerCreatePostBtn.classList.add("hidden");
  }

  const unreadCount = state.notifications.filter(n => n.unread).length;
  const badgeEl = document.getElementById("header-bell-badge");
  if (unreadCount > 0) {
    badgeEl.classList.remove("hidden");
    badgeEl.textContent = unreadCount;
  } else {
    badgeEl.classList.add("hidden");
  }

  if (state.activeView.startsWith("article-read-")) {
    const postId = state.activeView.replace("article-read-", "");
    renderReadingMode(postId);
  } else {
    switch (state.activeView) {
      case "dashboard":
        renderDashboard();
        break;
      case "comm-free":
        renderCommunityFeed("free");
        break;
      case "comm-explorer":
        renderCommunityFeed("explorer");
        break;
      case "comm-pro":
        renderCommunityFeed("pro");
        break;
      case "roadmaps":
        renderRoadmaps();
        break;
      case "resources":
        renderResources();
        break;
      case "assets":
        renderAssets();
        break;
      case "notifications":
        renderNotifications();
        break;
      case "profile":
        renderProfile();
        break;
      default:
        renderDashboard();
    }
  }
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  if (window.TranslationService) {
    TranslationService.localizeUI();
  }
}

// --- SIGN OUT / AUTH ---
window.logout = async function() {
  await client.auth.signOut();
  state.userLoggedIn = false;
  localStorage.removeItem("userLoggedIn");
  saveState();
  window.location.href = "index.html";
};

function renderUpgradeCard(viewName) {
  let targetTier = "Explorer";
  let description = "Unlock project walkthroughs, intermediate roadmaps, exclusive founder insights, templates, and community discussions.";
  let price = "$7 (₹674.60) / month";
  
  if (viewName === "comm-pro") {
    targetTier = "KrishtaKarma Pro";
    description = "Step into professional engineering. Access advanced systems architecture blueprints, live mentorship recordings, career guidance, and live chats.";
    price = "$18 (₹1734.69) / month";
  }

  mainViewContent.innerHTML = `
    <div class="card locked-community-card">
      <div class="lock-illustration">
        <i data-lucide="lock" style="width: 32px; height: 32px;"></i>
      </div>
      <h2 class="lock-heading">${targetTier} is Locked</h2>
      <p class="lock-desc">${description}</p>
      <div class="pricing-label" style="font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 8px 0;">
        Upgrade for ${price}
      </div>
      <button class="upgrade-btn" onclick="simulateUpgrade('${viewName}')">
        Unlock Immediate Access
      </button>
      <div style="font-size: 11px; color: var(--text-muted);">
        (Or switch roles using the tester bar at the bottom right)
      </div>
    </div>
  `;
}

async function simulateUpgrade(viewName) {
  const selectedPlan = (viewName === "comm-pro") ? "pro" : "explorer";
  const submitBtn = document.querySelector(".upgrade-btn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Processing...";
  }

  try {
    const { data: { session } } = await client.auth.getSession();
    if (!session) throw new Error("Please log in to upgrade.");

    // Load Razorpay Script dynamically if not already available
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      document.head.appendChild(script);
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = () => reject(new Error("Failed to load Razorpay SDK."));
      });
    }

    // 1. Create subscription request to Netlify Function
    const res = await fetch("/.netlify/functions/create-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: selectedPlan })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Failed to initiate subscription.");
    }

    const { subscriptionId } = await res.json();

    // 2. Open Razorpay Checkout modal
    const options = {
      key: "rzp_live_T7qdOA6MamdgQu", // Live Razorpay Key ID
      subscription_id: subscriptionId,
      name: "Krishnaite Academy",
      description: `${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} Membership Tier`,
      image: "assets/favicon.png",
      handler: async function (response) {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Verifying payment...";
        }

        try {
          // 3. Verify payment signature on the backend Netlify function
          const verifyRes = await fetch("/.netlify/functions/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: session.user.id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature
            })
          });

          if (!verifyRes.ok) {
            const verifyErr = await verifyRes.json();
            throw new Error(verifyErr.error || "Payment verification failed.");
          }

          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            alert(`🎉 Payment verified successfully! Your account has been upgraded to ${selectedPlan.toUpperCase()}.`);
            // Refresh profiles from Supabase and render
            await loadState();
            renderActiveView();
          } else {
            throw new Error("Payment verification rejected by server.");
          }
        } catch (verErr) {
          alert("Verification Error: " + verErr.message);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Unlock Immediate Access";
          }
        }
      },
      prefill: {
        email: session.user.email
      },
      theme: {
        color: "#c5a059"
      },
      modal: {
        ondismiss: function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Unlock Immediate Access";
          }
        }
      }
    };

    console.log("RAZORPAY OPTIONS", options);
    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (err) {
    alert("Error: " + err.message);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Unlock Immediate Access";
    }
  }
}

function updateUserInterfaceElements() {
  const sidebarUserCard = document.getElementById("sidebar-user-card");
  const user = getCurrentUser();
  
  if (sidebarUserCard && user) {
    sidebarUserCard.innerHTML = `
      <img src="${user.avatar}" alt="${user.name}" class="user-avatar">
      <div class="user-info-text">
        <span class="user-name">${user.name}</span>
        <span class="user-badge">${user.role === 'founder' ? 'founder' : user.tier + ' member'}</span>
      </div>
    `;
  }

  const roleSelect = document.getElementById("role-select");
  if (roleSelect) {
    roleSelect.value = state.currentUserRole;
  }
}

// --- 5A. VIEW: DASHBOARD ---
function renderDashboard() {
  const user = getCurrentUser();
  const accessibleChannels = ["free"];
  if (state.currentUserRole === "explorer" || state.isFounder) accessibleChannels.push("explorer");
  if (state.currentUserRole === "pro" || state.isFounder) {
    accessibleChannels.push("explorer");
    accessibleChannels.push("pro");
  }

  const allAccessiblePosts = state.posts.filter(p => accessibleChannels.includes(p.community));
  const latestAnnouncement = allAccessiblePosts.find(p => p.pinned) || allAccessiblePosts[0];

  const inProgressRoadmaps = state.roadmaps.filter(r => {
    const total = r.topics.length;
    const completed = r.topics.filter(t => t.completed).length;
    return completed > 0 && completed < total;
  });
  
  const showLearningItems = inProgressRoadmaps.length > 0 ? inProgressRoadmaps : state.roadmaps.slice(0, 2);

  let learningHTML = "";
  showLearningItems.forEach(roadmap => {
    const total = roadmap.topics.length;
    const completed = roadmap.topics.filter(t => t.completed).length;
    const percent = Math.round((completed / total) * 100);
    
    learningHTML += `
      <div class="continue-learning-item">
        <div class="learning-icon-box">
          <i data-lucide="map" style="width: 20px; height: 20px;"></i>
        </div>
        <div class="learning-details">
          <div class="learning-title">${roadmap.title}</div>
          <div class="learning-progress-track">
            <div class="learning-progress-fill" style="width: ${percent}%;"></div>
          </div>
        </div>
        <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-right: 12px;">${percent}%</div>
        <button class="learning-action-btn" onclick="navigateToView('roadmaps')">Continue</button>
      </div>
    `;
  });

  const totalComments = state.posts.reduce((sum, p) => sum + p.comments.length, 0);

  mainViewContent.innerHTML = `
    <div class="greeting-section">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
        <div>
          <h1 class="greeting-title">Radhe Radhe, ${user.name.split(' ')[0]} 👋</h1>
          <p class="greeting-subtitle">Welcome back. Keep learning, keep building, stay distraction-free.</p>
        </div>
        <div class="dashboard-member-count" style="font-size: 13.5px; font-weight: 600; color: var(--text-secondary); display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 20px; box-shadow: var(--shadow-xs);">
          <span>👥</span> <span id="community-member-count">—</span> <span>Krishnaites</span>
        </div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="dashboard-main">
        
        <!-- Latest Announcement -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="card-header-padding" style="border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between;">
            <span class="section-card-title" style="margin-bottom: 0;">
              <i data-lucide="megaphone" style="color: var(--primary);"></i> Pinned Announcement
            </span>
          </div>
          
          <div class="card-content-padding">
            ${latestAnnouncement ? `
              <div class="pinned-announcement" style="cursor: pointer;" onclick="openArticleRead('${latestAnnouncement.id}')">
                <div class="pinned-badge">
                  <i data-lucide="pin" style="width: 12px; height: 12px;"></i> Featured
                </div>
                <h3 class="pinned-title">${latestAnnouncement.title}</h3>
                <p class="pinned-desc">${latestAnnouncement.excerpt || latestAnnouncement.body.substring(0, 150) + '...'}</p>
                <div class="pinned-footer">
                  <span>Posted in #${latestAnnouncement.community} by Founder</span>
                  <a href="#" class="pinned-view-link">
                    Read Article <i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>
                  </a>
                </div>
              </div>
            ` : `
              <div class="empty-state" style="padding: 20px 0;">
                <i data-lucide="info" class="empty-state-icon"></i>
                <div class="empty-state-title">No announcements yet</div>
              </div>
            `}
          </div>
        </div>

        <!-- Continue Learning -->
        <div class="card">
          <span class="section-card-title">
            <i data-lucide="book-open" style="color: var(--primary);"></i> Continue Learning
          </span>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${learningHTML}
          </div>
        </div>

      </div>

      <div class="dashboard-sidebar">
        
        <!-- My Communities -->
        <div class="card">
          <span class="section-card-title">
            <i data-lucide="hash" style="color: var(--primary);"></i> My Communities
          </span>
          <div class="community-quick-list">
            <div class="community-quick-card" onclick="navigateToView('comm-free')">
              <div class="community-quick-info">
                <div class="comm-icon-sphere comm-icon-free">F</div>
                <div class="community-quick-text">Krishnaite Free</div>
              </div>
              <div class="community-quick-meta">General</div>
            </div>

            <div class="community-quick-card ${isViewLocked('comm-explorer') ? 'locked' : ''}" onclick="navigateToView('comm-explorer')">
              <div class="community-quick-info">
                <div class="comm-icon-sphere comm-icon-explorer">E</div>
                <div class="community-quick-text">Karma Explorer</div>
              </div>
              <div>
                ${isViewLocked('comm-explorer') ? '<i data-lucide="lock" class="nav-lock-icon"></i>' : '<span class="community-quick-meta">Premium</span>'}
              </div>
            </div>

            <div class="community-quick-card ${isViewLocked('comm-pro') ? 'locked' : ''}" onclick="navigateToView('comm-pro')">
              <div class="community-quick-info">
                <div class="comm-icon-sphere comm-icon-pro">P</div>
                <div class="community-quick-text">KrishtaKarma Pro</div>
              </div>
              <div>
                ${isViewLocked('comm-pro') ? '<i data-lucide="lock" class="nav-lock-icon"></i>' : '<span class="community-quick-meta">Pro</span>'}
              </div>
            </div>
          </div>
        </div>

        <!-- Statistics -->
        <div class="card">
          <span class="section-card-title">
            <i data-lucide="bar-chart-3" style="color: var(--primary);"></i> Statistics
          </span>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-number">${state.posts.length}</div>
              <div class="stat-label">Articles</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${totalComments}</div>
              <div class="stat-label">Comments</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${state.resources.length}</div>
              <div class="stat-label">Resources</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${state.roadmaps.length}</div>
              <div class="stat-label">Roadmaps</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
  loadMemberCount();
}

window.navigateToView = function(view) {
  const item = document.querySelector(`.sidebar-nav-item[data-view="${view}"]`);
  if (item) {
    item.click();
  } else {
    // If router matches but sidebar doesn't have an item, route manually
    state.activeView = view;
    saveState();
    renderActiveView();
  }
};

window.openArticleRead = function(postId) {
  state.activeView = "article-read-" + postId;
  saveState();
  renderActiveView();
};

// --- 5B. VIEW: COMMUNITY FEED ---
function renderCommunityFeed(communityKey) {
  const posts = state.posts.filter(p => p.community === communityKey);
  
  posts.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  let title = "Krishnaite Free Feed";
  let tagline = "Beginner updates, programming tips, announcements, roadmaps.";
  if (communityKey === "explorer") {
    title = "KrishtaKarma Explorer Feed";
    tagline = "Premium walkthroughs, templates, intermediate guides, founder logs.";
  } else if (communityKey === "pro") {
    title = "KrishtaKarma Pro Portal";
    tagline = "Advanced engineering systems design, live sessions, career mentorship.";
  }

  let postsHTML = "";
  if (posts.length === 0) {
    postsHTML = `
      <div class="card empty-state">
        <i data-lucide="inbox" class="empty-state-icon" style="width: 48px; height: 48px;"></i>
        <div class="empty-state-title">No articles published yet</div>
        <div class="empty-state-desc">Founder articles will appear here. Stay tuned!</div>
      </div>
    `;
  } else {
    posts.forEach(post => {
      const isLiked = post.likes.includes(state.currentUserRole);
      const isSaved = getCurrentUser().savedPostIds.includes(post.id);
      
      let attachmentsHTML = "";
      if (post.attachments && post.attachments.length > 0) {
        attachmentsHTML = `<div class="post-attachments">`;
        post.attachments.forEach(att => {
          attachmentsHTML += `
            <div class="attachment-item" onclick="event.stopPropagation(); alert('Downloading attachment: ${att.name}')">
              <i data-lucide="paperclip" class="attachment-icon"></i>
              <span>${att.name}</span>
            </div>
          `;
        });
        attachmentsHTML += `</div>`;
      }

      const textOnly = post.body.replace(/<[^>]*>/g, '');
      const wordsCount = textOnly.trim().split(/\s+/).length;
      const readTime = Math.max(1, Math.round(wordsCount / 200));

      postsHTML += `
        <div class="card post-card ${post.pinned ? 'pinned' : ''}" id="${post.id}" onclick="openArticleRead('${post.id}')">
          ${post.pinned ? `<div class="post-pinned-label"><i data-lucide="pin" style="width: 12px; height: 12px;"></i> Pinned</div>` : ''}
          
          <div class="post-header">
            <div class="post-author-info">
              <img src="${post.author.avatar}" class="author-avatar" alt="${post.author.name}">
              <div class="author-meta">
                <div class="author-name-row">
                  <span class="author-name">${post.author.name}</span>
                  <span class="role-badge">${post.author.role}</span>
                </div>
                <span class="post-time">${new Date(post.createdAt).toLocaleDateString()} &bull; ${readTime} min read</span>
              </div>
            </div>
            
            ${state.isFounder ? `
              <div class="post-admin-actions" onclick="event.stopPropagation();">
                <button class="admin-action-btn" title="Pin / Unpin" onclick="togglePinPost('${post.id}')">
                  <i data-lucide="pin" style="width: 14px; height: 14px; ${post.pinned ? 'fill: var(--primary); color: var(--primary);' : ''}"></i>
                </button>
                <button class="admin-action-btn" title="Edit Post" onclick="editArticle('${post.id}')">
                  <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
                </button>
                <button class="admin-action-btn delete" title="Delete Post" onclick="deletePost('${post.id}')">
                  <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                </button>
              </div>
            ` : ''}
          </div>

          <h2 class="section-card-title">${post.title}</h2>
          ${post.excerpt ? `<p style="font-size: 13.5px; color: var(--text-secondary); margin-bottom: 12px; font-style: italic;">${post.excerpt}</p>` : ''}
          
          <div class="post-body">${post.body}</div>
          
          ${post.coverImage ? `
            <div class="post-image-container">
              <img src="${post.coverImage}" class="post-image" style="object-position: center ${post.coverY}%;" alt="Post cover">
            </div>
          ` : ''}

          ${renderPostGalleryHTML(post.id, post.images)}

          ${attachmentsHTML}

          <div class="post-actions-bar" onclick="event.stopPropagation();">
            <button class="action-btn ${isLiked ? 'active' : ''}" onclick="likePost('${post.id}')">
              <i data-lucide="heart" style="width: 16px; height: 16px;"></i>
              <span>Like${post.likes.length > 0 ? ` (${post.likes.length})` : ''}</span>
            </button>
            
            <button class="action-btn" onclick="openArticleRead('${post.id}')">
              <i data-lucide="message-square" style="width: 16px; height: 16px;"></i>
              <span>Comments${post.comments.length > 0 ? ` (${post.comments.length})` : ''}</span>
            </button>
            
            <button class="action-btn bookmark-btn ${isSaved ? 'active' : ''}" onclick="bookmarkPost('${post.id}')">
              <i data-lucide="bookmark" style="width: 16px; height: 16px;"></i>
              <span>${isSaved ? 'Bookmarked' : 'Bookmark'}</span>
            </button>

            <button class="action-btn" onclick="sharePost('${post.id}')">
              <i data-lucide="share-2" style="width: 16px; height: 16px;"></i>
              <span>Share</span>
            </button>

            <button class="action-btn translate-btn" onclick="toggleTranslatePost('${post.id}', this, event)" data-translated="false">
              <i data-lucide="globe" style="width: 16px; height: 16px;"></i>
              <span>Translate</span>
            </button>
          </div>
        </div>
      `;
    });
  }

  mainViewContent.innerHTML = `
    <div class="feed-header">
      <h1 class="feed-title">
        <i data-lucide="hash" style="color: var(--primary);"></i> ${title}
      </h1>
      <p class="feed-tagline">${tagline}</p>
    </div>
    
    <div class="feed-posts-list">
      ${postsHTML}
    </div>
  `;
}

// --- 5C. VIEW: READING MODE ---
function renderReadingMode(postId) {
  const post = state.posts.find(p => p.id === postId);
  if (!post) {
    mainViewContent.innerHTML = `
      <div class="card empty-state">
        <i data-lucide="frown" class="empty-state-icon"></i>
        <div class="empty-state-title">Article not found</div>
      </div>
    `;
    return;
  }

  mainAppContainer.classList.remove("hidden");
  editorView.classList.add("hidden");

  const isLiked = post.likes.includes(state.currentUserRole);
  const isSaved = getCurrentUser().savedPostIds.includes(post.id);

  const textOnly = post.body.replace(/<[^>]*>/g, '');
  const wordsCount = textOnly.trim().split(/\s+/).length;
  const readTime = Math.max(1, Math.round(wordsCount / 200));

  let commentsHTML = "";
  if (post.commentsEnabled === false) {
    commentsHTML = `<div style="text-align: center; color: var(--text-muted); font-size:13px; padding: 20px 0;">Comments are disabled for this article.</div>`;
  } else {
    post.comments.forEach(comment => {
      const cLiked = comment.likes.includes(state.currentUserRole);
      let repliesHTML = "";
      
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.forEach(reply => {
          const rLiked = reply.likes && reply.likes.includes(state.currentUserRole);
          repliesHTML += `
            <div class="comment-card">
              <img src="${reply.author.avatar}" class="comment-avatar" alt="${reply.author.name}">
              <div class="comment-content-container">
                <div class="comment-bubble">
                  <div class="comment-author-name">${reply.author.name} <span class="role-badge" style="font-size: 8px;">${reply.author.role}</span></div>
                  <div class="comment-text">${reply.text}</div>
                               <div class="comment-actions">
                  <span class="comment-action-link ${rLiked ? 'active' : ''}" onclick="likeComment('${post.id}', '${comment.id}', true, '${reply.id}')">
                    Like${reply.likes.length > 0 ? ` (${reply.likes.length})` : ''}
                  </span>
                  <span>&bull;</span>
                  <span class="comment-action-link" onclick="toggleTranslateComment('${post.id}', '${comment.id}', '${reply.id}', this)" data-translated="false">Translate</span>
                </div>
              </div>
            </div>
          `;
        });
      }

      commentsHTML += `
        <div style="display: flex; flex-direction: column; gap: 8px; border-bottom: 1px solid var(--border); padding-bottom: 16px; margin-bottom: 16px;">
          <div class="comment-card">
            <img src="${comment.author.avatar}" class="comment-avatar" alt="${comment.author.name}">
            <div class="comment-content-container">
              <div class="comment-bubble">
                <div class="comment-author-name">${comment.author.name} <span class="role-badge" style="font-size: 8px;">${comment.author.role}</span></div>
                <div class="comment-text">${comment.text}</div>
              </div>
              <div class="comment-actions">
                <span class="comment-action-link ${cLiked ? 'active' : ''}" onclick="likeComment('${post.id}', '${comment.id}', false)">
                  Like${comment.likes.length > 0 ? ` (${comment.likes.length})` : ''}
                </span>
                <span>&bull;</span>
                <span class="comment-action-link" onclick="focusReplyInput('${post.id}', '${comment.id}')">Reply</span>
                <span>&bull;</span>
                <span class="comment-action-link" onclick="toggleTranslateComment('${post.id}', '${comment.id}', '', this)" data-translated="false">Translate</span>
              </div>
            </div>
          </div>
          
          <div class="reply-list" id="replies-${comment.id}">
            ${repliesHTML}
          </div>
        </div>
      `;
    });
  }

  mainViewContent.innerHTML = `
    <button class="btn-secondary" onclick="navigateToView('comm-${post.community}')" style="margin-bottom: 24px; padding: 6px 12px; border-radius: var(--radius-sm);">
      <i data-lucide="arrow-left" style="width: 14px; height: 14px; vertical-align: middle;"></i> Back to Feed
    </button>
    
    <article class="reading-article-container">
      ${post.coverImage ? `
        <div class="reading-cover-banner" style="background-image: url('${post.coverImage}'); background-position: center ${post.coverY}%;"></div>
      ` : ''}
      
      <div class="reading-body-wrap">
        
        <header class="reading-meta-header">
          <h1 class="reading-article-title">${post.title}</h1>
          
          <div class="reading-author-row">
            <div class="reading-author-details">
              <img src="${post.author.avatar}" class="reading-author-avatar" alt="${post.author.name}">
              <div>
                <div style="font-weight:600; font-size:14px;">${post.author.name} <span class="role-badge" style="font-size:9px;">${post.author.role}</span></div>
                <div class="reading-meta-text">Published in #${post.community} &bull; ${new Date(post.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
            
            <div class="reading-meta-text">
              <i data-lucide="clock" style="width: 12px; height: 12px; display: inline; vertical-align: middle;"></i> ${readTime} min read
            </div>
          </div>
        </header>
        
        ${post.excerpt ? `<p style="font-size: 18px; color: var(--text-secondary); line-height: 1.6; font-style: italic; margin-bottom: 30px; border-left: 3px solid var(--primary); padding-left: 16px;">${post.excerpt}</p>` : ''}
        
        <div class="reading-text-content">
          ${post.body}
        </div>
        
        ${renderPostGalleryHTML(post.id, post.images)}
        
        <div class="post-actions-bar" style="border-top: 1px solid var(--border); margin-top: 40px; padding-top: 16px;">
          <button class="action-btn ${isLiked ? 'active' : ''}" onclick="likePost('${post.id}')">
            <i data-lucide="heart" style="width: 16px; height: 16px;"></i>
            <span>Like${post.likes.length > 0 ? ` (${post.likes.length})` : ''}</span>
          </button>
          
          <button class="action-btn bookmark-btn ${isSaved ? 'active' : ''}" onclick="bookmarkPost('${post.id}')">
            <i data-lucide="bookmark" style="width: 16px; height: 16px;"></i>
            <span>${isSaved ? 'Bookmarked' : 'Bookmark'}</span>
          </button>
          
          <button class="action-btn" onclick="sharePost('${post.id}')">
            <i data-lucide="share-2" style="width: 16px; height: 16px;"></i>
            <span>Share</span>
          </button>

          <button class="action-btn translate-btn" onclick="toggleTranslatePost('${post.id}', this, event)" data-translated="false">
            <i data-lucide="globe" style="width: 16px; height: 16px;"></i>
            <span>Translate</span>
          </button>
        </div>

        <div class="comments-section" style="margin-top: 40px;">
          <h3 class="section-card-title" style="border-bottom: 1px solid var(--border); padding-bottom: 12px;">Discussion (${post.comments.length})</h3>
          
          <div class="comments-list" style="margin-top: 24px;">
            ${commentsHTML}
          </div>
          
          ${post.commentsEnabled !== false ? `
            <div class="comment-input-area" style="margin-top: 24px;">
              <img src="${getCurrentUser().avatar}" class="comment-avatar" alt="Avatar">
              <div class="comment-field-wrapper">
                <textarea class="comment-textarea" id="comment-input-${post.id}" placeholder="Join the discussion..." onkeydown="handleCommentSubmit(event, '${post.id}')"></textarea>
              </div>
              <button class="comment-send-btn" onclick="submitComment('${post.id}')">Comment</button>
            </div>
          ` : ''}
        </div>
        
      </div>
    </article>
  `;
}

// --- 5D. VIEW: ROADMAPS ---
function renderRoadmaps() {
  let roadmapsHTML = "";
  
  const completedMap = JSON.parse(localStorage.getItem("krishnaite_completed_topics") || "{}");

  state.roadmaps.forEach(roadmap => {
    const total = roadmap.topics.length;
    const completedCount = roadmap.topics.filter((t, idx) => !!completedMap[`${roadmap.id}-${idx}`]).length;
    const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    let topicsHTML = "";
    roadmap.topics.forEach((topic, idx) => {
      const isCompleted = !!completedMap[`${roadmap.id}-${idx}`];
      topicsHTML += `
        <div class="topic-check-item ${isCompleted ? 'completed' : ''}" onclick="toggleTopic('${roadmap.id}', ${idx})">
          <div class="topic-checkbox"></div>
          <span>${topic.name}</span>
        </div>
      `;
    });

    roadmapsHTML += `
      <div class="card roadmap-card" data-roadmap-id="${roadmap.id}">
        <div class="roadmap-header-row">
          <div class="roadmap-info-col">
            <h2 class="section-card-title" style="margin-bottom: 4px;">${roadmap.title}</h2>
            <div class="roadmap-meta-badges" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span class="roadmap-meta-badge">${roadmap.difficulty}</span>
              <span class="roadmap-meta-badge"><i data-lucide="clock" style="width: 10px; height: 10px; display: inline; vertical-align: middle;"></i> ${roadmap.duration}</span>
              ${TranslationService.shouldShowTranslate(roadmap.title, 'en') ? `
                <button class="roadmap-translate-btn" onclick="event.stopPropagation(); toggleTranslateRoadmap('${roadmap.id}', this)" data-translated="false" style="background: none; border: none; font-size: 11px; font-weight: 600; color: var(--primary); cursor: pointer; display: flex; align-items: center; gap: 4px;">
                  <i data-lucide="globe" style="width: 12px; height: 12px;"></i> Translate
                </button>
              ` : ''}
            </div>
          </div>
          
          <div class="roadmap-progress-col">
            <div class="roadmap-progress-stats">${completedCount} / ${total} Topics (${percent}%)</div>
            <div class="roadmap-progress-bar">
              <div class="roadmap-progress-fill" style="width: ${percent}%;"></div>
            </div>
          </div>
        </div>
        
        <div class="roadmap-topics">
          <h4 class="roadmap-topics-title">Topics Checklist</h4>
          <div class="topics-checklist">
            ${topicsHTML}
          </div>
        </div>

        ${roadmap.nextRoadmap !== 'None (Keep building!)' ? `
          <div class="roadmap-next-suggestion">
            Recommended Next Step: 
            <span class="next-roadmap-link" onclick="scrollToRoadmap('${roadmap.nextRoadmap}')">
              ${roadmap.nextRoadmap} <i data-lucide="arrow-right" style="width: 12px; height: 12px; display: inline; vertical-align: middle;"></i>
            </span>
          </div>
        ` : ''}
      </div>
    `;
  });

  const createBtnHTML = state.isFounder ? `
    <button class="btn-primary" onclick="openCreateRoadmapPrompt()" style="padding: 10px 18px; font-weight:600; display:flex; align-items:center; gap:8px;">
      <i data-lucide="plus" style="width: 16px; height: 16px;"></i> Create Roadmap
    </button>
  ` : "";

  mainViewContent.innerHTML = `
    <div class="roadmaps-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
      <div>
        <h1 class="roadmaps-title">Learning Roadmaps</h1>
        <p class="feed-tagline">Track your structured software engineering journey step-by-step.</p>
      </div>
      ${createBtnHTML}
    </div>
    
    <div class="roadmaps-grid">
      ${roadmapsHTML}
    </div>
  `;
}

window.toggleTopic = function(roadmapId, topicIndex) {
  const completedMap = JSON.parse(localStorage.getItem("krishnaite_completed_topics") || "{}");
  const key = `${roadmapId}-${topicIndex}`;
  completedMap[key] = !completedMap[key];
  localStorage.setItem("krishnaite_completed_topics", JSON.stringify(completedMap));
  renderActiveView();
};

window.scrollToRoadmap = function(roadmapTitle) {
  const cards = document.querySelectorAll(".roadmap-card");
  for (let card of cards) {
    const title = card.querySelector(".section-card-title").textContent;
    if (title.toLowerCase().includes(roadmapTitle.toLowerCase())) {
      card.scrollIntoView({ behavior: 'smooth' });
      card.style.borderColor = 'var(--primary)';
      setTimeout(() => card.style.borderColor = 'var(--border)', 2000);
      break;
    }
  }
};

// --- 5E. VIEW: RESOURCES ---
let activeResourceCategory = "All";

function renderResources() {
  const categories = ["All", "Cheat Sheets", "Programming Guides", "Templates", "Wallpapers", "AI Resources", "Downloads", "Open Source Resources"];
  
  let tabsHTML = "";
  categories.forEach(cat => {
    tabsHTML += `
      <button class="resource-tab-btn ${activeResourceCategory === cat ? 'active' : ''}" onclick="setResourceCategory('${cat}')">
        ${cat}
      </button>
    `;
  });

  const filtered = activeResourceCategory === "All" 
    ? state.resources 
    : state.resources.filter(r => r.category === activeResourceCategory);

  let gridHTML = "";
  if (filtered.length === 0) {
    gridHTML = `
      <div class="card empty-state" style="grid-column: 1 / -1;">
        <i data-lucide="folder" class="empty-state-icon" style="width: 48px; height: 48px;"></i>
        <div class="empty-state-title">No resources available</div>
        <div class="empty-state-desc">There are no items matching this category yet.</div>
      </div>
    `;
  } else {
    filtered.forEach(res => {
      const isLocked = !checkTierAccess(res.visibility || "free");
      const lockIconHTML = isLocked ? `<i data-lucide="lock" style="width: 14px; height: 14px; margin-left: auto; color: var(--danger);"></i>` : "";
      
      gridHTML += `
        <div class="card resource-card">
          <div class="resource-cover" style="background-image: url('${res.cover}');">
            <span class="resource-badge">${res.category}</span>
          </div>
          <div class="resource-info-body">
            <div style="display:flex; align-items:center; gap:8px;">
              <h3 class="resource-title-text" style="margin:0;">${res.title}</h3>
              ${lockIconHTML}
            </div>
            <p class="resource-desc">${res.desc}</p>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto; font-size:11px; color:var(--text-muted); margin-bottom:12px;">
              <span class="role-badge" style="font-size:9px;">${(res.visibility || 'free').toUpperCase()}</span>
              ${TranslationService.shouldShowTranslate(res.title + ' ' + res.desc, 'en') ? `
                <button class="resource-translate-btn" onclick="event.stopPropagation(); toggleTranslateResource('${res.id}', this)" data-translated="false" style="background: none; border: none; font-size: 11px; font-weight: 600; color: var(--primary); cursor: pointer; display: flex; align-items: center; gap: 4px;">
                  <i data-lucide="globe" style="width: 12px; height: 12px;"></i> Translate
                </button>
              ` : ''}
            </div>
            <button class="resource-download-btn" onclick="downloadResourceFile('${res.id}')">
              <i data-lucide="download" style="width: 14px; height: 14px;"></i> Access Resource
            </button>
          </div>
        </div>
      `;
    });
  }

  const addBtnHTML = state.isFounder ? `
    <button class="btn-primary" onclick="openAddResourcePrompt()" style="padding: 10px 18px; font-weight:600; display:flex; align-items:center; gap:8px;">
      <i data-lucide="plus" style="width: 16px; height: 16px;"></i> Add Resource
    </button>
  ` : "";

  mainViewContent.innerHTML = `
    <div class="resources-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
      <div>
        <h1 class="roadmaps-title">Resources Repository</h1>
        <p class="feed-tagline">Exclusive guides, starter-kits, configurations, and wallpapers.</p>
      </div>
      ${addBtnHTML}
    </div>
    
    <div class="resources-tabs" style="margin-top: 12px; width: 100%;">
      ${tabsHTML}
    </div>
    
    <div class="resources-grid" style="margin-top: 24px;">
      ${gridHTML}
    </div>
  `;
}

window.setResourceCategory = function(cat) {
  activeResourceCategory = cat;
  renderActiveView();
};

// --- 5E_2. VIEW: ASSETS ---
let activeAssetCategory = "All";

function renderAssets() {
  const categories = ["All", "Desktop Wallpapers", "Mobile Wallpapers", "Tablet Wallpapers", "Icons", "Templates", "Brand Assets"];
  
  let tabsHTML = "";
  categories.forEach(cat => {
    tabsHTML += `
      <button class="resource-tab-btn ${activeAssetCategory === cat ? 'active' : ''}" onclick="setAssetCategory('${cat}')">
        ${cat}
      </button>
    `;
  });

  const filtered = activeAssetCategory === "All" 
    ? (state.assets || []) 
    : (state.assets || []).filter(a => a.category === activeAssetCategory);

  let gridHTML = "";
  if (filtered.length === 0) {
    gridHTML = `
      <div class="card empty-state" style="grid-column: 1 / -1;">
        <i data-lucide="package" class="empty-state-icon" style="width: 48px; height: 48px;"></i>
        <div class="empty-state-title">No assets available</div>
        <div class="empty-state-desc">There are no items matching this category yet.</div>
      </div>
    `;
  } else {
    filtered.forEach(asset => {
      const isLocked = !checkTierAccess(asset.visibility);
      const lockIconHTML = isLocked ? `<i data-lucide="lock" style="width: 14px; height: 14px; margin-left: auto; color: var(--danger);"></i>` : "";
      
      gridHTML += `
        <div class="card resource-card">
          <div class="resource-cover" style="background-image: url('${asset.preview_image || asset.previewImage || ''}');">
            <span class="resource-badge">${asset.category}</span>
          </div>
          <div class="resource-info-body">
            <div style="display:flex; align-items:center; gap:8px;">
              <h3 class="resource-title-text" style="margin:0;">${asset.title}</h3>
              <span style="font-size:10px; background:var(--bg-secondary); padding:2px 6px; border-radius:10px; color:var(--text-secondary);">v${asset.version || '1.0.0'}</span>
              ${lockIconHTML}
            </div>
            <p class="resource-desc">${asset.description || ''}</p>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto; font-size:11px; color:var(--text-muted); margin-bottom:12px;">
              <span>Downloads: ${asset.downloads || 0}</span>
              <span class="role-badge" style="font-size:9px;">${asset.visibility.toUpperCase()}</span>
            </div>
            <button class="resource-download-btn" onclick="downloadAssetFile('${asset.id}')">
              <i data-lucide="download" style="width: 14px; height: 14px;"></i> Download Asset
            </button>
          </div>
        </div>
      `;
    });
  }

  const addBtnHTML = state.isFounder ? `
    <button class="btn-primary" onclick="openAddAssetPrompt()" style="padding: 10px 18px; font-weight:600; display:flex; align-items:center; gap:8px;">
      <i data-lucide="plus" style="width: 16px; height: 16px;"></i> Add Asset
    </button>
  ` : "";

  mainViewContent.innerHTML = `
    <div class="resources-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
      <div>
        <h1 class="roadmaps-title">Design Assets Sanctuary</h1>
        <p class="feed-tagline">Premium wallpapers, icon sets, presentations, templates, and UI resource kits.</p>
      </div>
      ${addBtnHTML}
    </div>
    
    <div class="resources-tabs" style="margin-top: 12px; width: 100%;">
      ${tabsHTML}
    </div>
    
    <div class="resources-grid" style="margin-top: 24px;">
      ${gridHTML}
    </div>
  `;
}

window.setAssetCategory = function(cat) {
  activeAssetCategory = cat;
  renderActiveView();
};

window.checkTierAccess = function(requiredTier) {
  const currentRole = state.currentUserRole;
  if (state.isFounder || currentRole === "pro") return true;
  if (requiredTier === "free") return true;
  if (requiredTier === "explorer") return currentRole === "explorer";
  return false;
};

window.downloadAssetFile = async function(assetId) {
  const asset = (state.assets || []).find(a => a.id === assetId);
  if (!asset) return;

  if (!checkTierAccess(asset.visibility)) {
    renderUpgradeCard(asset.visibility === 'pro' ? 'comm-pro' : 'comm-explorer');
    return;
  }

  // Increment download count locally
  asset.downloads = (asset.downloads || 0) + 1;
  saveState();
  renderActiveView();

  // Async update in Supabase
  if (window.client) {
    try {
      await window.client.from("assets").update({ downloads: asset.downloads }).eq("id", assetId);
    } catch (err) {}
  }

  // Trigger download link
  const link = document.createElement("a");
  link.href = asset.file_url || asset.fileUrl || "#";
  link.target = "_blank";
  link.download = asset.title;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

window.downloadResourceFile = function(resId) {
  const res = state.resources.find(r => r.id === resId);
  if (!res) return;

  if (!checkTierAccess(res.visibility || "free")) {
    renderUpgradeCard(res.visibility === 'pro' ? 'comm-pro' : 'comm-explorer');
    return;
  }

  // Trigger download link
  const link = document.createElement("a");
  link.href = res.url || "#";
  link.target = "_blank";
  link.download = res.title;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- 5F. VIEW: NOTIFICATIONS ---
function renderNotifications() {
  let listHTML = "";
  
  if (state.notifications.length === 0) {
    listHTML = `
      <div class="card empty-state">
        <i data-lucide="bell-off" class="empty-state-icon" style="width: 48px; height: 48px;"></i>
        <div class="empty-state-title">All caught up!</div>
        <div class="empty-state-desc">You don't have any notifications at the moment.</div>
      </div>
    `;
  } else {
    state.notifications.forEach(notif => {
      let icon = "bell";
      if (notif.type === "announcement") icon = "megaphone";
      if (notif.type === "resource") icon = "folder";
      if (notif.type === "like") icon = "heart";
      if (notif.type === "comment") icon = "message-square";
      
      listHTML += `
        <div class="card notif-card ${notif.unread ? 'unread' : ''}" onclick="markNotificationRead('${notif.id}')">
          <div class="notif-icon-circle">
            <i data-lucide="${icon}" style="width: 16px; height: 16px;"></i>
          </div>
          <div class="notif-content-area">
            <p class="notif-text">${notif.text}</p>
            <span class="notif-time">${notif.time}</span>
          </div>
        </div>
      `;
    });
  }

  mainViewContent.innerHTML = `
    <div class="notif-header">
      <h1 class="notif-title">Notifications</h1>
      <p class="feed-tagline">Stay updated with activities from the founder and comments on your threads.</p>
    </div>
    
    <div class="notif-list">
      ${listHTML}
    </div>
  `;
}

window.markNotificationRead = function(id) {
  const notif = state.notifications.find(n => n.id === id);
  if (notif && notif.unread) {
    notif.unread = false;
    saveState();
    renderActiveView();
  }
};

// --- 5G. VIEW: PROFILE ---
let activeProfileTab = "saved";

function renderProfile() {
  const user = getCurrentUser();
  const savedPosts = state.posts.filter(p => user.savedPostIds.includes(p.id));
  
  let tabContentHTML = "";
  
  if (activeProfileTab === "saved") {
    if (savedPosts.length === 0) {
      tabContentHTML = `
        <div class="card empty-state">
          <i data-lucide="bookmark" class="empty-state-icon" style="width: 40px; height: 40px;"></i>
          <div class="empty-state-title">No saved articles</div>
          <div class="empty-state-desc">Articles you bookmark will appear here for easy reference.</div>
        </div>
      `;
    } else {
      savedPosts.forEach(post => {
        tabContentHTML += `
          <div class="card continue-learning-item" style="padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-md); margin-bottom: 12px; cursor: pointer;" onclick="openArticleRead('${post.id}')">
            <div class="learning-icon-box" style="background-color: var(--primary-light);">
              <i data-lucide="bookmark" style="width: 18px; height: 18px; color: var(--primary); fill: var(--primary);"></i>
            </div>
            <div class="learning-details">
              <div class="learning-title" style="font-size: 14.5px; font-weight: 600;">${post.title}</div>
              <div style="font-size: 12px; color: var(--text-muted);">Saved from #${post.community}</div>
            </div>
            <i data-lucide="chevron-right" style="color: var(--text-muted);"></i>
          </div>
        `;
      });
    }
  } else {
    if (!user.commentHistory || user.commentHistory.length === 0) {
      tabContentHTML = `
        <div class="card empty-state">
          <i data-lucide="message-square" class="empty-state-icon" style="width: 40px; height: 40px;"></i>
          <div class="empty-state-title">No comments yet</div>
          <div class="empty-state-desc">Engage in community feeds to start discussions!</div>
        </div>
      `;
    } else {
      user.commentHistory.forEach(comm => {
        tabContentHTML += `
          <div class="card" style="padding: 16px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: var(--text-muted); margin-bottom: 8px;">
              <span>Commented on "${comm.postTitle}"</span>
              <span>${comm.date}</span>
            </div>
            <div style="font-size: 13.5px; color: var(--text-secondary); font-style: italic;">"${comm.text}"</div>
          </div>
        `;
      });
    }
  }

  mainViewContent.innerHTML = `
    <div class="card profile-card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
      <div style="display: flex; align-items: center; gap: 20px;">
        <img src="${user.avatar}" alt="${user.name}" class="profile-avatar-large">
        <div class="profile-details-main">
          <div class="profile-name-row">
            <h2 class="profile-name">${user.name}</h2>
            <span class="role-badge" style="padding: 3px 10px; font-size: 11px;">${user.role === 'founder' ? 'founder' : user.tier + ' tier'}</span>
          </div>
          <div class="profile-join-date">
            <i data-lucide="calendar" style="width: 14px; height: 14px; display: inline; vertical-align: middle;"></i> Joined ${user.joinDate}
          </div>
        </div>
      </div>

      <!-- Preferred Language Settings block -->
      <div class="profile-settings-block" style="min-width: 220px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px; box-shadow: var(--shadow-sm);">
        <label style="display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 8px;" data-translate-key="preferred_lang">Preferred Language</label>
        <select onchange="selectLang(this.value)" class="current-lang-select" style="width: 100%; height: 40px; padding: 8px 12px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary); font-size: 14px; font-weight: 500; outline: none; cursor: pointer;">
          <option value="en">English</option>
          <option value="te">Telugu (తెలుగు)</option>
          <option value="hi">Hindi (हिन्दी)</option>
          <option value="ta">Tamil (தமிழ்)</option>
          <option value="kn">Kannada (ಕನ್ನಡ)</option>
          <option value="ml">Malayalam (മലയാളം)</option>
          <option value="mr">Marathi (मराठी)</option>
          <option value="bn">Bengali (বাংলা)</option>
          <option value="gu">Gujarati (ગુજરાતી)</option>
          <option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
        </select>
      </div>
    </div>

    <script>
      // Automatically update selection to active language preference
      setTimeout(() => {
        const selectElement = document.querySelector(".profile-settings-block .current-lang-select");
        if (selectElement) {
          selectElement.value = TranslationService.currentLanguage;
        }
      }, 50);
    </script>
    
    <div class="profile-tabs">
      <span class="profile-tab-item ${activeProfileTab === 'saved' ? 'active' : ''}" onclick="setProfileTab('saved')">Saved Articles</span>
      <span class="profile-tab-item ${activeProfileTab === 'comments' ? 'active' : ''}" onclick="setProfileTab('comments')">My Activity</span>
    </div>
    
    <div>
      ${tabContentHTML}
    </div>
  `;
}

window.setProfileTab = function(tab) {
  activeProfileTab = tab;
  renderActiveView();
};

// --- 5H. VIEW: SEARCH ---
function renderSearchResults(query) {
  const matchedPosts = state.posts.filter(p => 
    p.title.toLowerCase().includes(query) || 
    p.body.toLowerCase().includes(query)
  );

  const matchedResources = state.resources.filter(r => 
    r.title.toLowerCase().includes(query) || 
    r.desc.toLowerCase().includes(query)
  );

  const matchedRoadmaps = state.roadmaps.filter(rm => 
    rm.title.toLowerCase().includes(query)
  );

  let resultsHTML = "";
  let totalCount = matchedPosts.length + matchedResources.length + matchedRoadmaps.length;

  if (totalCount === 0) {
    resultsHTML = `
      <div class="card empty-state">
        <i data-lucide="search-code" class="empty-state-icon" style="width: 48px; height: 48px;"></i>
        <div class="empty-state-title">No matches found</div>
        <div class="empty-state-desc">Try searching for keywords like "html5", "concurrency", or "compilers".</div>
      </div>
    `;
  } else {
    if (matchedPosts.length > 0) {
      resultsHTML += `<h3 class="nav-section-title" style="margin: 20px 0 10px 0;">Matched Articles (${matchedPosts.length})</h3>`;
      matchedPosts.forEach(post => {
        resultsHTML += `
          <div class="card continue-learning-item" style="padding: 16px; margin-bottom: 10px; cursor: pointer;" onclick="openArticleRead('${post.id}')">
            <div class="learning-icon-box" style="background-color: var(--primary-light);">
              <i data-lucide="message-square" style="color: var(--primary); width: 18px; height: 18px;"></i>
            </div>
            <div class="learning-details">
              <div class="learning-title" style="font-weight: 600;">${post.title}</div>
              <div style="font-size: 12px; color: var(--text-secondary);">${post.excerpt || post.body.substring(0, 80) + '...'}</div>
            </div>
            <span class="role-badge" style="font-size: 8px;">#${post.community}</span>
          </div>
        `;
      });
    }

    if (matchedRoadmaps.length > 0) {
      resultsHTML += `<h3 class="nav-section-title" style="margin: 20px 0 10px 0;">Matched Roadmaps (${matchedRoadmaps.length})</h3>`;
      matchedRoadmaps.forEach(rm => {
        resultsHTML += `
          <div class="card continue-learning-item" style="padding: 16px; margin-bottom: 10px; cursor: pointer;" onclick="navigateToView('roadmaps')">
            <div class="learning-icon-box">
              <i data-lucide="map" style="width: 18px; height: 18px;"></i>
            </div>
            <div class="learning-details">
              <div class="learning-title" style="font-weight: 600;">${rm.title}</div>
              <div style="font-size: 12px; color: var(--text-secondary);">${rm.difficulty} &bull; ${rm.duration}</div>
            </div>
            <i data-lucide="chevron-right" style="color: var(--text-muted);"></i>
          </div>
        `;
      });
    }

    if (matchedResources.length > 0) {
      resultsHTML += `<h3 class="nav-section-title" style="margin: 20px 0 10px 0;">Matched Resources (${matchedResources.length})</h3>`;
      matchedResources.forEach(res => {
        resultsHTML += `
          <div class="card continue-learning-item" style="padding: 16px; margin-bottom: 10px; cursor: pointer;" onclick="navigateToView('resources')">
            <div class="learning-icon-box" style="background-image: url('${res.cover}'); background-size: cover;"></div>
            <div class="learning-details" style="margin-left: 12px;">
              <div class="learning-title" style="font-weight: 600;">${res.title}</div>
              <div style="font-size: 12px; color: var(--text-secondary);">${res.category}</div>
            </div>
            <i data-lucide="download" style="color: var(--text-secondary); width: 16px;"></i>
          </div>
        `;
      });
    }
  }

  mainViewContent.innerHTML = `
    <div class="notif-header">
      <h1 class="notif-title">Search Results</h1>
      <p class="feed-tagline">Found ${totalCount} results matching "${query}"</p>
    </div>
    
    <div style="margin-top: 24px;">
      ${resultsHTML}
    </div>
  `;
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// --- 6. FEED ACTIONS ---
window.likePost = function(postId) {
  const post = state.posts.find(p => p.id === postId);
  if (!post) return;
  
  const userRole = state.currentUserRole;
  const idx = post.likes.indexOf(userRole);
  if (idx === -1) {
    post.likes.push(userRole);
    // Notify founder if a student likes an article
    if (!state.isFounder) {
      const user = getCurrentUser();
      if (!state.notifications) state.notifications = [];
      state.notifications.unshift({
        id: "notif-like-" + Date.now(),
        text: `**${user.name}** liked the article: "${post.title}"`,
        time: "Just now",
        unread: true,
        type: "like"
      });
    }
  } else {
    post.likes.splice(idx, 1);
  }
  
  saveState();
  renderActiveView();
};

window.bookmarkPost = function(postId) {
  const user = getCurrentUser();
  const idx = user.savedPostIds.indexOf(postId);
  if (idx === -1) {
    user.savedPostIds.push(postId);
  } else {
    user.savedPostIds.splice(idx, 1);
  }
  
  saveState();
  renderActiveView();
};

window.sharePost = function(postId) {
  const shareURL = `${window.location.origin}${window.location.pathname}#post-${postId}`;
  navigator.clipboard.writeText(shareURL)
    .then(() => alert(`Link copied to clipboard: ${shareURL}`))
    .catch(() => alert(`Share URL: ${shareURL}`));
};

window.focusCommentInput = function(postId) {
  const el = document.getElementById(`comment-input-${postId}`);
  if (el) el.focus();
};

window.handleCommentSubmit = function(e, postId) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    submitComment(postId);
  }
};

window.submitComment = function(postId) {
  const post = state.posts.find(p => p.id === postId);
  const el = document.getElementById(`comment-input-${postId}`);
  if (!post || !el) return;
  
  const text = el.value.trim();
  if (text.length === 0) return;
  
  const user = getCurrentUser();
  const userRole = state.currentUserRole;
  
  const newComment = {
    id: "c-" + Date.now(),
    author: {
      name: user.name,
      avatar: user.avatar,
      role: userRole === "founder" ? "founder" : `${user.tier} member`
    },
    text: text,
    likes: [],
    replies: []
  };
  
  post.comments.push(newComment);
  
  if (!user.commentHistory) user.commentHistory = [];
  user.commentHistory.unshift({
    text: text,
    date: "Just now",
    postTitle: post.title
  });

  // Notify founder dashboard of comments by students
  if (userRole !== "founder") {
    if (!state.notifications) state.notifications = [];
    state.notifications.unshift({
      id: "notif-c-founder-" + Date.now(),
      text: `**${user.name}** commented on "${post.title}": "${text.substring(0, 30)}..."`,
      time: "Just now",
      unread: true,
      type: "comment"
    });
  } else if (post.author.email !== user.email) {
    state.notifications.unshift({
      id: "notif-c-" + Date.now(),
      text: `**${user.name}** commented on your article: "${text.substring(0, 30)}..."`,
      time: "Just now",
      unread: true,
      type: "comment"
    });
  }

  el.value = "";
  saveState();
  renderActiveView();
};

window.focusReplyInput = function(postId, commentId) {
  const thread = document.getElementById(`replies-${commentId}`);
  if (!thread) return;

  const existing = document.getElementById(`reply-input-wrapper-${commentId}`);
  if (existing) {
    existing.remove();
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.id = `reply-input-wrapper-${commentId}`;
  wrapper.style.display = "flex";
  wrapper.style.gap = "10px";
  wrapper.style.marginTop = "12px";
  wrapper.style.paddingLeft = "24px";
  
  wrapper.innerHTML = `
    <img src="${getCurrentUser().avatar}" class="comment-avatar" alt="Avatar" style="width:24px; height:24px;">
    <div class="comment-field-wrapper">
      <input type="text" class="comment-textarea" id="reply-field-${commentId}" placeholder="Write a reply... (Enter to post)" style="height:32px; font-size:12px; padding:4px 10px;" onkeydown="handleReplySubmit(event, '${postId}', '${commentId}')">
    </div>
    <button class="comment-send-btn" style="height:32px; font-size:11px; padding:0 12px;" onclick="submitReply('${postId}', '${commentId}')">Reply</button>
  `;

  thread.appendChild(wrapper);
  document.getElementById(`reply-field-${commentId}`).focus();
};

window.handleReplySubmit = function(e, postId, commentId) {
  if (e.key === "Enter") {
    e.preventDefault();
    submitReply(postId, commentId);
  }
};

window.submitReply = function(postId, commentId) {
  const post = state.posts.find(p => p.id === postId);
  if (!post) return;
  const comment = post.comments.find(c => c.id === commentId);
  if (!comment) return;
  
  const el = document.getElementById(`reply-field-${commentId}`);
  if (!el) return;
  
  const text = el.value.trim();
  if (text.length === 0) return;
  
  const user = getCurrentUser();
  const userRole = state.currentUserRole;
  
  const newReply = {
    id: "r-" + Date.now(),
    author: {
      name: user.name,
      avatar: user.avatar,
      role: userRole === "founder" ? "founder" : `${user.tier} member`
    },
    text: text,
    likes: []
  };
  
  if (!comment.replies) comment.replies = [];
  comment.replies.push(newReply);
  
  if (!user.commentHistory) user.commentHistory = [];
  user.commentHistory.unshift({
    text: `Replied: "${text}"`,
    date: "Just now",
    postTitle: post.title
  });

  saveState();
  renderActiveView();
};

window.likeComment = function(postId, commentId, isReply = false, replyId = null) {
  const post = state.posts.find(p => p.id === postId);
  if (!post) return;
  const comment = post.comments.find(c => c.id === commentId);
  if (!comment) return;

  const currentRole = state.currentUserRole;

  if (isReply) {
    const reply = comment.replies.find(r => r.id === replyId);
    if (reply) {
      if (!reply.likes) reply.likes = [];
      const idx = reply.likes.indexOf(currentRole);
      if (idx === -1) {
        reply.likes.push(currentRole);
      } else {
        reply.likes.splice(idx, 1);
      }
    }
  } else {
    const idx = comment.likes.indexOf(currentRole);
    if (idx === -1) {
      comment.likes.push(currentRole);
    } else {
      comment.likes.splice(idx, 1);
    }
  }

  saveState();
  renderActiveView();
};

// --- 7. EDITOR DELEGATE (logic lives in editor.js) ---
function openEditor(editId = null) {
  if (typeof KrishnaiteEditor !== 'undefined') {
    KrishnaiteEditor.open(editId);
  }
}

window.editArticle = function(postId) {
  openEditor(postId);
};

window.deletePost = function(postId) {
  if (confirm("Are you sure you want to delete this article?")) {
    state.posts = state.posts.filter(p => p.id !== postId);
    saveState();
    renderActiveView();
  }
};

window.togglePinPost = function(postId) {
  const post = state.posts.find(p => p.id === postId);
  if (post) {
    const originalPin = post.pinned;
    if (!originalPin) {
      state.posts.forEach(p => {
        if (p.community === post.community) p.pinned = false;
      });
    }
    post.pinned = !originalPin;
    saveState();
    renderActiveView();
  }
};

// --- 8. SIMULATED USER SELECT SWITCHER ---
const roleSelect = document.getElementById("role-select");
if (roleSelect) {
  roleSelect.addEventListener("change", (e) => {
    const val = e.target.value;
    state.currentUserRole = val;
    
    if (!state.userLoggedIn) {
      state.userLoggedIn = true;
      localStorage.setItem("userLoggedIn", "true");
    }
    
    saveState();
    updateUserInterfaceElements();
    
    if (isViewLocked(state.activeView)) {
      state.activeView = "dashboard";
      saveState();
    }
    
    renderActiveView();
  });
}


// --- Founder Roadmap & Resource Creator Prompts ---
window.openCreateRoadmapPrompt = function() {
  document.getElementById("founder-roadmap-modal").classList.remove("hidden");
};

window.openAddResourcePrompt = function() {
  document.getElementById("founder-resource-modal").classList.remove("hidden");
};

window.openAddAssetPrompt = function() {
  document.getElementById("founder-asset-modal").classList.remove("hidden");
};

window.closeFounderModal = function(type) {
  document.getElementById(`founder-${type}-modal`).classList.add("hidden");
};

async function triggerFeedNotification(type, title, category, targetView) {
  try {
    const { data: { session } } = await client.auth.getSession();
    if (!session) return;
    
    let icon = "📚";
    let actionWord = "New Roadmap Published";
    if (type === "resource") {
      icon = "📦";
      actionWord = "New Resource Uploaded";
    } else if (type === "asset") {
      icon = "🎁";
      actionWord = "New Wallpaper Added";
    }

    const postTitle = `${icon} ${actionWord}`;
    const body = `<p>A brand new ${type} has been published: <strong>${title}</strong> (${category}). Check it out in the ${type}s section!</p>`;

    // Insert into posts table
    await client.from("posts").insert([{
      title: postTitle,
      body: body,
      community: "free", // Always put in free community so everyone can see!
      excerpt: `Check out the new ${type}: ${title}`,
      tags: [type, category.toLowerCase()],
      pinned: false,
      comments_enabled: true,
      author_id: session.user.id,
      likes: [],
      comments: []
    }]);

    // Also push locally to state.posts so it reflects immediately
    const newPost = {
      id: 'post-' + Date.now(),
      title: postTitle,
      body: body,
      community: "free",
      excerpt: `Check out the new ${type}: ${title}`,
      tags: [type, category.toLowerCase()],
      pinned: false,
      commentsEnabled: true,
      likes: [],
      comments: [],
      createdAt: new Date().toISOString(),
      author: { name: "Harshita", email: "founder@krishnaite.dev", avatar: "assets/founder.png", role: "founder" }
    };
    state.posts.unshift(newPost);
    saveState();
  } catch (err) {
    console.error("Failed to insert feed notification:", err);
  }
}

window.submitFounderRoadmap = async function(e) {
  e.preventDefault();
  const submitBtn = document.getElementById("rm-submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Publishing...";

  const title = document.getElementById("rm-title").value.trim();
  const desc = document.getElementById("rm-desc").value.trim();
  const difficulty = document.getElementById("rm-difficulty").value;
  const duration = document.getElementById("rm-duration").value.trim();
  const visibility = document.getElementById("rm-visibility").value;
  const topicsStr = document.getElementById("rm-topics").value;
  const topics = topicsStr.split(/[,\n]/).map(t => ({ name: t.trim(), completed: false })).filter(t => t.name);

  try {
    const { data: { session } } = await client.auth.getSession();
    if (!session) throw new Error("No session found");

    // Insert roadmap
    const { data, error } = await client.from("roadmaps").insert([{
      title,
      description: desc,
      difficulty,
      duration,
      visibility,
      topics,
      created_by: session.user.id
    }]);

    if (error) throw error;

    // Refresh state & UI
    await loadState();
    closeFounderModal("roadmap");
    document.getElementById("founder-roadmap-form").reset();
    renderActiveView();

    // Trigger Feed Notification
    await triggerFeedNotification("roadmap", title, difficulty, "roadmaps");
    alert("Roadmap successfully published!");
  } catch (err) {
    alert("Error creating roadmap: " + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Publish Roadmap";
  }
};

window.submitFounderResource = async function(e) {
  e.preventDefault();
  const submitBtn = document.getElementById("res-submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Uploading...";

  const title = document.getElementById("res-title").value.trim();
  const desc = document.getElementById("res-desc").value.trim();
  const category = document.getElementById("res-category").value;
  const visibility = document.getElementById("res-visibility").value;
  const fileInput = document.getElementById("res-file");
  const externalLink = document.getElementById("res-external").value.trim();

  try {
    const { data: { session } } = await client.auth.getSession();
    if (!session) throw new Error("No session found");

    let fileUrl = null;
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      
      const { data: uploadData, error: uploadErr } = await client.storage
        .from("resources")
        .upload(fileName, file);

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = client.storage
        .from("resources")
        .getPublicUrl(fileName);

      fileUrl = publicUrl;
    }

    const { error } = await client.from("resources").insert([{
      title,
      description: desc,
      category,
      visibility,
      file_url: fileUrl || null,
      external_link: externalLink || null,
      thumbnail: "https://images.unsplash.com/photo-1618401471353-b98aedd07871?auto=format&fit=crop&w=400&q=80",
      created_by: session.user.id
    }]);

    if (error) throw error;

    await loadState();
    closeFounderModal("resource");
    document.getElementById("founder-resource-form").reset();
    renderActiveView();

    await triggerFeedNotification("resource", title, category, "resources");
    alert("Resource successfully uploaded!");
  } catch (err) {
    alert("Error uploading resource: " + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Upload Resource";
  }
};

window.submitFounderAsset = async function(e) {
  e.preventDefault();
  const submitBtn = document.getElementById("asset-submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Uploading...";

  const title = document.getElementById("asset-title-input").value.trim();
  const desc = document.getElementById("asset-desc").value.trim();
  const category = document.getElementById("asset-category").value;
  const visibility = document.getElementById("asset-visibility").value;
  const version = document.getElementById("asset-version").value.trim() || "1.0.0";
  const preview = document.getElementById("asset-preview").value.trim();
  const fileInput = document.getElementById("asset-file");

  try {
    const { data: { session } } = await client.auth.getSession();
    if (!session) throw new Error("No session found");

    let fileUrl = null;
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      
      // 5. Verify the uploaded object is a real File object
      if (!(file instanceof File)) {
        throw new Error("Selected file is not a valid File object.");
      }

      // 4. Generate valid unique path
      const uuidVal = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      const filePath = `${Date.now()}-${uuidVal}-${file.name}`;

      // 2. Log before upload
      console.log("Supabase Storage Upload Payload:", {
        bucket: "assets",
        filePath: filePath,
        file: file,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      });

      // 6. Verify the upload call uses the correct API
      const { data: uploadData, error: uploadErr } = await client.storage
        .from('assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      // 3. Log the complete upload result
      console.log("Supabase Storage Upload Result:", { data: uploadData, error: uploadErr });

      if (uploadErr) {
        // 9. Display exact Supabase error
        throw new Error("Supabase Storage Upload Error: " + (uploadErr.message || JSON.stringify(uploadErr)));
      }

      // 7. Retrieve public URL
      const { data: publicUrlData } = client.storage
        .from('assets')
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error("Failed to retrieve public URL from Supabase Storage.");
      }

      fileUrl = publicUrlData.publicUrl;
    } else {
      throw new Error("Please select a file to upload.");
    }

    // 8. Store ONLY the public URL and metadata inside the assets table
    const { error: insertErr } = await client.from("assets").insert([{
      title,
      description: desc,
      category,
      preview_image: preview || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80",
      file_url: fileUrl,
      visibility,
      version,
      downloads: 0,
      created_by: session.user.id
    }]);

    if (insertErr) throw insertErr;

    await loadState();
    closeFounderModal("asset");
    document.getElementById("founder-asset-form").reset();
    renderActiveView();

    await triggerFeedNotification("asset", title, category, "assets");
    alert("Asset successfully uploaded!");
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Upload Asset";
  }
};


// --- 9. STARTUP ---
document.addEventListener("DOMContentLoaded", async () => {
  await loadState();
  updateUserInterfaceElements();
  initNavigation();
  renderActiveView();

  // Listen to language updates globally and re-render views and update selector values dynamically
  document.addEventListener("languageChanged", (e) => {
    TranslationService.localizeUI();
    const selectors = document.querySelectorAll(".current-lang-select");
    selectors.forEach(sel => {
      sel.value = e.detail;
    });
    renderActiveView();
  });

  initLightboxEvents();
});


// ── Lightbox & Post Images Support ──────────────────────────────────────────

function renderPostGalleryHTML(postId, images) {
  if (!images || !Array.isArray(images) || images.length === 0) return "";
  
  const sorted = [...images].sort((a, b) => (a.order || 0) - (b.order || 0));
  const count = sorted.length;
  
  let gridStyle = "display: grid; gap: 8px; margin-top: 12px; border-radius: var(--radius-sm); overflow: hidden;";
  let itemsHTML = "";
  
  if (count === 1) {
    gridStyle += "grid-template-columns: 1fr;";
    const img = sorted[0];
    itemsHTML = `
      <div style="position: relative; cursor: zoom-in;" onclick="event.stopPropagation(); openLightbox('${postId}', 0)">
        <img src="${img.url}" alt="${img.alt || 'Community Image'}" loading="lazy" decoding="async" style="width: 100%; max-height: 500px; object-fit: cover; display: block;">
      </div>
    `;
  } else if (count === 2) {
    gridStyle += "grid-template-columns: 1fr 1fr;";
    sorted.forEach((img, idx) => {
      itemsHTML += `
        <div style="position: relative; cursor: zoom-in; aspect-ratio: 4/3;" onclick="event.stopPropagation(); openLightbox('${postId}', ${idx})">
          <img src="${img.url}" alt="${img.alt || 'Community Image'}" loading="lazy" decoding="async" style="width: 100%; height: 100%; object-fit: cover; display: block;">
        </div>
      `;
    });
  } else if (count === 3) {
    gridStyle += "grid-template-columns: 2fr 1fr; grid-template-rows: repeat(2, 150px);";
    itemsHTML = `
      <div style="position: relative; cursor: zoom-in; grid-row: span 2;" onclick="event.stopPropagation(); openLightbox('${postId}', 0)">
        <img src="${sorted[0].url}" alt="${sorted[0].alt || 'Community Image'}" loading="lazy" decoding="async" style="width: 100%; height: 100%; object-fit: cover; display: block;">
      </div>
      <div style="position: relative; cursor: zoom-in;" onclick="event.stopPropagation(); openLightbox('${postId}', 1)">
        <img src="${sorted[1].url}" alt="${sorted[1].alt || 'Community Image'}" loading="lazy" decoding="async" style="width: 100%; height: 100%; object-fit: cover; display: block;">
      </div>
      <div style="position: relative; cursor: zoom-in;" onclick="event.stopPropagation(); openLightbox('${postId}', 2)">
        <img src="${sorted[2].url}" alt="${sorted[2].alt || 'Community Image'}" loading="lazy" decoding="async" style="width: 100%; height: 100%; object-fit: cover; display: block;">
      </div>
    `;
  } else if (count === 4) {
    gridStyle += "grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 180px);";
    sorted.forEach((img, idx) => {
      itemsHTML += `
        <div style="position: relative; cursor: zoom-in;" onclick="event.stopPropagation(); openLightbox('${postId}', ${idx})">
          <img src="${img.url}" alt="${img.alt || 'Community Image'}" loading="lazy" decoding="async" style="width: 100%; height: 100%; object-fit: cover; display: block;">
        </div>
      `;
    });
  } else {
    gridStyle += "grid-template-columns: repeat(6, 1fr); grid-template-rows: repeat(2, 160px);";
    const extra = count - 5;
    
    itemsHTML = `
      <div style="grid-column: span 3; position: relative; cursor: zoom-in;" onclick="event.stopPropagation(); openLightbox('${postId}', 0)">
        <img src="${sorted[0].url}" alt="${sorted[0].alt || 'Community Image'}" loading="lazy" decoding="async" style="width: 100%; height: 100%; object-fit: cover; display: block;">
      </div>
      <div style="grid-column: span 3; position: relative; cursor: zoom-in;" onclick="event.stopPropagation(); openLightbox('${postId}', 1)">
        <img src="${sorted[1].url}" alt="${sorted[1].alt || 'Community Image'}" loading="lazy" decoding="async" style="width: 100%; height: 100%; object-fit: cover; display: block;">
      </div>
      <div style="grid-column: span 2; position: relative; cursor: zoom-in;" onclick="event.stopPropagation(); openLightbox('${postId}', 2)">
        <img src="${sorted[2].url}" alt="${sorted[2].alt || 'Community Image'}" loading="lazy" decoding="async" style="width: 100%; height: 100%; object-fit: cover; display: block;">
      </div>
      <div style="grid-column: span 2; position: relative; cursor: zoom-in;" onclick="event.stopPropagation(); openLightbox('${postId}', 3)">
        <img src="${sorted[3].url}" alt="${sorted[3].alt || 'Community Image'}" loading="lazy" decoding="async" style="width: 100%; height: 100%; object-fit: cover; display: block;">
      </div>
      <div style="grid-column: span 2; position: relative; cursor: zoom-in;" onclick="event.stopPropagation(); openLightbox('${postId}', 4)">
        <img src="${sorted[4].url}" alt="${sorted[4].alt || 'Community Image'}" loading="lazy" decoding="async" style="width: 100%; height: 100%; object-fit: cover; display: block;">
        ${extra > 0 ? `
          <div style="position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; color:#fff; font-size:20px; font-weight:700; font-family:'Outfit',sans-serif;">
            +${extra}
          </div>
        ` : ''}
      </div>
    `;
  }
  
  return `<div class="post-gallery" style="${gridStyle}">${itemsHTML}</div>`;
}

let currentLightboxPostId = null;
let currentLightboxIndex = 0;

window.openLightbox = function(postId, index) {
  const post = state.posts.find(p => p.id === postId);
  if (!post || !post.images || post.images.length === 0) return;
  
  currentLightboxPostId = postId;
  currentLightboxIndex = index;
  
  const overlay = document.getElementById("lightbox-overlay");
  overlay.classList.remove("hidden");
  
  _renderLightboxImage();
};

function _renderLightboxImage() {
  const post = state.posts.find(p => p.id === currentLightboxPostId);
  if (!post || !post.images || post.images.length === 0) return;
  
  const sorted = [...post.images].sort((a, b) => (a.order || 0) - (b.order || 0));
  const img = sorted[currentLightboxIndex];
  
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const lightboxCounter = document.getElementById("lightbox-counter");
  
  lightboxImg.src = img.url;
  lightboxCaption.textContent = img.alt || "Community Image";
  lightboxCounter.textContent = `${currentLightboxIndex + 1} / ${sorted.length}`;
}

window.closeLightbox = function() {
  const overlay = document.getElementById("lightbox-overlay");
  overlay.classList.add("hidden");
};

window.nextLightboxImage = function() {
  const post = state.posts.find(p => p.id === currentLightboxPostId);
  if (!post || !post.images || post.images.length === 0) return;
  
  currentLightboxIndex = (currentLightboxIndex + 1) % post.images.length;
  _renderLightboxImage();
};

window.prevLightboxImage = function() {
  const post = state.posts.find(p => p.id === currentLightboxPostId);
  if (!post || !post.images || post.images.length === 0) return;
  
  currentLightboxIndex = (currentLightboxIndex - 1 + post.images.length) % post.images.length;
  _renderLightboxImage();
};

function initLightboxEvents() {
  const closeBtn = document.getElementById("lightbox-close");
  const prevBtn = document.getElementById("lightbox-prev");
  const nextBtn = document.getElementById("lightbox-next");
  const overlay = document.getElementById("lightbox-overlay");
  
  if (closeBtn) closeBtn.onclick = window.closeLightbox;
  if (prevBtn) prevBtn.onclick = window.prevLightboxImage;
  if (nextBtn) nextBtn.onclick = window.nextLightboxImage;
  
  if (overlay) {
    overlay.onclick = (e) => {
      if (e.target === overlay) window.closeLightbox();
    };
  }
  
  document.addEventListener("keydown", (e) => {
    if (overlay && !overlay.classList.contains("hidden")) {
      if (e.key === "Escape") window.closeLightbox();
      if (e.key === "ArrowRight") window.nextLightboxImage();
      if (e.key === "ArrowLeft") window.prevLightboxImage();
    }
  });
}
