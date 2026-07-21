// Supabase 配置
const SUPABASE_URL = 'https://pscappeeldsrmzjwwipk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_dyLT7gqLQedKGr_CpuV28w_tFIi5NOu';

// 初始化 Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 存储桶名称
const STORAGE_BUCKET = 'memories';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// 全局变量
let map;
let locationPicker;
let markers = {};
let memories = [];
let editingId = null;
let uploadedFiles = [];
let externalLinks = [];
let currentView = 'map';

// DOM 元素
const mapTab = document.getElementById('map-tab');
const listTab = document.getElementById('list-tab');
const memoriesPanel = document.getElementById('memories-panel');
const closePanelBtn = document.getElementById('close-panel');
const addMemoryBtn = document.getElementById('add-memory-btn');
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const memoryForm = document.getElementById('memory-form');
const modalTitle = document.getElementById('modal-title');
const submitBtn = document.getElementById('submit-btn');
const mediaUploadSection = document.getElementById('media-upload-section');
const mediaInput = document.getElementById('media-input');
const mediaPreview = document.getElementById('media-preview');
const uploadProgress = document.getElementById('upload-progress');
const uploadProgressFill = document.getElementById('upload-progress-fill');
const uploadProgressText = document.getElementById('upload-progress-text');
const externalLinkInput = document.getElementById('external-link-input');
const addExternalLinkBtn = document.getElementById('add-external-link');
const externalLinksList = document.getElementById('external-links-list');

// 初始化
async function init() {
    initMap();
    setupEventListeners();
    await loadMemories();
}

// 初始化地图
function initMap() {
    // 主地图
    map = L.map('map', {
        zoomControl: true,
        scrollWheelZoom: true
    }).setView([39.9042, 116.4074], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // 位置选择器（在模态框中）
    locationPicker = L.map('location-picker', {
        zoomControl: false,
        attributionControl: false,
        doubleClickZoom: false,
        scrollWheelZoom: false
    }).setView([39.9042, 116.4074], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: ''
    }).addTo(locationPicker);

    let pickerMarker = null;

    locationPicker.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        document.getElementById('memory-lat').value = lat;
        document.getElementById('memory-lng').value = lng;

        if (pickerMarker) {
            locationPicker.removeLayer(pickerMarker);
        }

        pickerMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'custom-marker',
                html: '📍',
                iconSize: [32, 32],
                iconAnchor: [16, 32]
            })
        }).addTo(locationPicker);

        locationPicker.setView([lat, lng], locationPicker.getZoom());
    });

    // 点击主地图标记并编辑
    map.on('click', (e) => {
        if (currentView === 'map') {
            openModal();
            // 同步位置到选择器
            setTimeout(() => {
                locationPicker.setView([e.latlng.lat, e.latlng.lng], locationPicker.getZoom());
                locationPicker.fire('click', e);
            }, 300);
        }
    });
}

// 设置事件监听
function setupEventListeners() {
    // Tab 切换
    mapTab.addEventListener('click', () => switchView('map'));
    listTab.addEventListener('click', () => switchView('list'));

    // 面板
    closePanelBtn.addEventListener('click', closeMemoriesPanel);

    // 添加按钮
    addMemoryBtn.addEventListener('click', openModal);

    // 模态框
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // 表单提交
    memoryForm.addEventListener('submit', handleFormSubmit);

    // 媒体上传
    mediaUploadSection.addEventListener('click', () => mediaInput.click());
    mediaInput.addEventListener('change', handleFileSelect);

    // 拖拽上传
    mediaUploadSection.addEventListener('dragover', (e) => {
        e.preventDefault();
        mediaUploadSection.classList.add('dragover');
    });

    mediaUploadSection.addEventListener('dragleave', () => {
        mediaUploadSection.classList.remove('dragover');
    });

    mediaUploadSection.addEventListener('drop', (e) => {
        e.preventDefault();
        mediaUploadSection.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    });

    // 外链
    addExternalLinkBtn.addEventListener('click', addExternalLink);
    externalLinkInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addExternalLink();
        }
    });
}

// 切换视图
function switchView(view) {
    currentView = view;

    if (view === 'map') {
        mapTab.classList.add('active');
        listTab.classList.remove('active');
        closeMemoriesPanel();
        map.invalidateSize();
    } else {
        listTab.classList.add('active');
        mapTab.classList.remove('active');
        openMemoriesPanel();
    }
}

// 打开回忆列表面板
function openMemoriesPanel() {
    memoriesPanel.classList.add('active');
}

// 关闭回忆列表面板
function closeMemoriesPanel() {
    memoriesPanel.classList.remove('active');
    if (currentView === 'list') {
        switchView('map');
    }
}

// 打开模态框
function openModal(memoryData = null) {
    editingId = memoryData?.id || null;
    modalTitle.textContent = editingId ? '编辑回忆' : '添加回忆';
    submitBtn.textContent = editingId ? '更新' : '保存';

    // 重置表单
    memoryForm.reset();
    uploadedFiles = [];
    externalLinks = [];
    mediaPreview.innerHTML = '';
    externalLinksList.innerHTML = '';
    uploadProgress.classList.remove('active');

    // 如果是编辑，填充数据
    if (memoryData) {
        document.getElementById('memory-title').value = memoryData.title || '';
        document.getElementById('memory-date').value = memoryData.date || '';
        document.getElementById('memory-description').value = memoryData.description || '';
        document.getElementById('memory-lat').value = memoryData.lat || '';
        document.getElementById('memory-lng').value = memoryData.lng || '';

        // 显示已有媒体
        if (memoryData.media && memoryData.media.length > 0) {
            memoryData.media.forEach(m => {
                if (m.type === 'file') {
                    uploadedFiles.push({ ...m, existing: true });
                } else if (m.type === 'external') {
                    externalLinks.push(m);
                }
            });
            renderMediaPreview();
            renderExternalLinks();
        }

        // 设置位置选择器
        if (memoryData.lat && memoryData.lng) {
            setTimeout(() => {
                locationPicker.setView([memoryData.lat, memoryData.lng], 12);
                locationPicker.fire('click', {
                    latlng: { lat: memoryData.lat, lng: memoryData.lng }
                });
            }, 300);
        }
    }

    modalOverlay.classList.add('active');

    // 重新渲染位置选择器
    setTimeout(() => {
        locationPicker.invalidateSize();
    }, 300);
}

// 关闭模态框
function closeModal() {
    modalOverlay.classList.remove('active');
    editingId = null;
    uploadedFiles = [];
    externalLinks = [];
}

// 处理文件选择
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    handleFiles(files);
    mediaInput.value = '';
}

// 处理文件
function handleFiles(files) {
    files.forEach(file => {
        // 检查文件大小
        if (file.size > MAX_FILE_SIZE) {
            alert(`文件 "${file.name}" 超过 50MB 限制，已跳过`);
            return;
        }

        // 检查文件类型
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            alert(`文件 "${file.name}" 不支持的格式，仅支持图片和视频`);
            return;
        }

        uploadedFiles.push({
            file: file,
            type: 'file',
            name: file.name,
            size: file.size,
            mimeType: file.type,
            existing: false
        });
    });

    renderMediaPreview();
}

// 渲染媒体预览
function renderMediaPreview() {
    mediaPreview.innerHTML = '';

    uploadedFiles.forEach((media, index) => {
        const item = document.createElement('div');
        item.className = 'media-preview-item';

        let mediaElement;
        if (media.existing) {
            // 已存在的文件
            if (media.mimeType?.startsWith('video/')) {
                mediaElement = document.createElement('video');
                mediaElement.muted = true;
            } else {
                mediaElement = document.createElement('img');
            }
            mediaElement.src = media.url;
        } else {
            // 新选择的文件
            if (media.file.type.startsWith('video/')) {
                mediaElement = document.createElement('video');
                mediaElement.muted = true;
            } else {
                mediaElement = document.createElement('img');
            }
            mediaElement.src = URL.createObjectURL(media.file);
        }

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '×';
        removeBtn.onclick = () => {
            uploadedFiles.splice(index, 1);
            renderMediaPreview();
        };

        item.appendChild(mediaElement);
        item.appendChild(removeBtn);
        mediaPreview.appendChild(item);
    });
}

// 添加外链
function addExternalLink() {
    const url = externalLinkInput.value.trim();
    if (!url) return;

    // 解析 URL
    const linkInfo = parseExternalLink(url);

    if (linkInfo) {
        externalLinks.push(linkInfo);
        renderExternalLinks();
        externalLinkInput.value = '';
    } else {
        alert('无法识别链接格式，请检查输入');
    }
}

// 解析外链
function parseExternalLink(url) {
    try {
        // Bilibili 链接
        const bvMatch = url.match(/bilibili\.com\/video\/(BV[\w]+)/);
        if (bvMatch) {
            return {
                type: 'external',
                platform: 'bilibili',
                url: url,
                bvid: bvMatch[1]
            };
        }

        // 检查是否是有效的图片/视频 URL
        if (url.match(/\.(jpg|jpeg|png|gif|webp|mp4|webm|ogg)(\?.*)?$/i)) {
            const isVideo = url.match(/\.(mp4|webm|ogg)(\?.*)?$/i);
            return {
                type: 'external',
                platform: 'direct',
                url: url,
                mimeType: isVideo ? 'video/mp4' : 'image/jpeg'
            };
        }

        return null;
    } catch (e) {
        return null;
    }
}

// 渲染外链列表
function renderExternalLinks() {
    externalLinksList.innerHTML = '';

    externalLinks.forEach((link, index) => {
        const tag = document.createElement('span');
        tag.className = 'external-link-tag';
        tag.textContent = link.platform === 'bilibili' ? '📺 Bilibili' : '🔗 外链';

        const remove = document.createElement('span');
        remove.className = 'remove-link';
        remove.textContent = ' ×';
        remove.onclick = () => {
            externalLinks.splice(index, 1);
            renderExternalLinks();
        };

        tag.appendChild(remove);
        externalLinksList.appendChild(tag);
    });
}

// 上传文件到 Supabase
async function uploadFile(file) {
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `memories/${fileName}`;

    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) throw error;

    // 获取公共 URL
    const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

    return {
        type: 'file',
        url: publicUrl,
        path: data.path,
        name: file.name,
        size: file.size,
        mimeType: file.type
    };
}

// 处理表单提交
async function handleFormSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('memory-title').value.trim();
    const date = document.getElementById('memory-date').value;
    const description = document.getElementById('memory-description').value;
    const lat = parseFloat(document.getElementById('memory-lat').value);
    const lng = parseFloat(document.getElementById('memory-lng').value);

    if (!title || isNaN(lat) || isNaN(lng)) {
        alert('请填写标题并选择位置');
        return;
    }

    // 收集所有媒体
    let allMedia = [];

    // 上传新文件
    const newFiles = uploadedFiles.filter(m => !m.existing);
    if (newFiles.length > 0) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading"></span>上传中...';
        uploadProgress.classList.add('active');

        for (let i = 0; i < newFiles.length; i++) {
            const file = newFiles[i].file;
            try {
                const uploaded = await uploadFile(file);
                allMedia.push(uploaded);

                // 更新进度
                const progress = Math.round(((i + 1) / newFiles.length) * 100);
                uploadProgressFill.style.width = `${progress}%`;
                uploadProgressText.textContent = `上传中... ${progress}%`;
            } catch (error) {
                console.error('上传失败:', error);
                alert(`上传文件 "${file.name}" 失败: ${error.message}`);
            }
        }
    }

    // 添加已存在的文件
    const existingFiles = uploadedFiles.filter(m => m.existing);
    allMedia = [...allMedia, ...existingFiles];

    // 添加外链
    allMedia = [...allMedia, ...externalLinks];

    const memoryData = {
        title,
        date: date || new Date().toISOString().split('T')[0],
        description,
        lat,
        lng,
        media: allMedia,
        updated_at: new Date().toISOString()
    };

    try {
        if (editingId) {
            // 更新现有回忆
            const { error } = await supabase
                .from('memories')
                .update(memoryData)
                .eq('id', editingId);

            if (error) throw error;
        } else {
            // 创建新回忆
            const { error } = await supabase
                .from('memories')
                .insert([{
                    ...memoryData,
                    created_at: new Date().toISOString()
                }]);

            if (error) throw error;
        }

        closeModal();
        await loadMemories();
    } catch (error) {
        console.error('保存失败:', error);
        alert(`保存失败: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = editingId ? '更新' : '保存';
        uploadProgress.classList.remove('active');
    }
}

// 加载回忆列表
async function loadMemories() {
    try {
        const { data, error } = await supabase
            .from('memories')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        memories = data || [];
        renderMemoriesList();
        renderMarkers();
    } catch (error) {
        console.error('加载回忆失败:', error);
    }
}

// 渲染回忆列表
function renderMemoriesList() {
    const listContainer = document.getElementById('memories-list');

    if (memories.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📍</div>
                <div class="empty-state-text">还没有回忆，点击 + 添加第一个回忆吧！</div>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = memories.map(memory => `
        <div class="memory-card" data-id="${memory.id}">
            <h3>${escapeHtml(memory.title)}</h3>
            <p>${memory.description ? escapeHtml(memory.description.substring(0, 100)) + (memory.description.length > 100 ? '...' : '') : '暂无描述'}</p>
            <div class="date">📅 ${memory.date || '未设置日期'}</div>
            <div class="actions">
                <button class="edit-btn" onclick="editMemory('${memory.id}')">编辑</button>
                <button class="delete-btn" onclick="deleteMemory('${memory.id}')">删除</button>
            </div>
        </div>
    `).join('');

    // 添加点击事件
    document.querySelectorAll('.memory-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('edit-btn') && !e.target.classList.contains('delete-btn')) {
                const id = card.dataset.id;
                focusOnMemory(id);
            }
        });
    });
}

// 渲染地图标记
function renderMarkers() {
    // 清除现有标记
    Object.values(markers).forEach(marker => map.removeLayer(marker));
    markers = {};

    memories.forEach(memory => {
        if (memory.lat && memory.lng) {
            const marker = L.marker([memory.lat, memory.lng], {
                icon: L.divIcon({
                    className: 'custom-marker',
                    html: '📍',
                    iconSize: [32, 32],
                    iconAnchor: [16, 32]
                })
            }).addTo(map);

            marker.bindPopup(`
                <div style="min-width: 200px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 16px;">${escapeHtml(memory.title)}</h3>
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">${escapeHtml(memory.description || '')}</p>
                    <p style="margin: 0; font-size: 12px; color: #999;">📅 ${memory.date || '未设置日期'}</p>
                </div>
            `);

            markers[memory.id] = marker;
        }
    });
}

// 聚焦到回忆
function focusOnMemory(id) {
    const memory = memories.find(m => m.id === id);
    if (memory && markers[id]) {
        map.setView([memory.lat, memory.lng], 14);
        markers[id].openPopup();

        // 切换到地图视图
        if (currentView === 'list') {
            switchView('map');
        }
    }
}

// 编辑回忆
window.editMemory = function(id) {
    const memory = memories.find(m => m.id === id);
    if (memory) {
        openModal(memory);
    }
};

// 删除回忆
window.deleteMemory = async function(id) {
    if (!confirm('确定要删除这个回忆吗？')) return;

    try {
        // 获取回忆信息
        const memory = memories.find(m => m.id === id);
        if (!memory) return;

        // 删除存储的文件
        if (memory.media && memory.media.length > 0) {
            for (const media of memory.media) {
                if (media.type === 'file' && media.path) {
                    await supabase.storage
                        .from(STORAGE_BUCKET)
                        .remove([media.path]);
                }
            }
        }

        // 删除数据库记录
        const { error } = await supabase
            .from('memories')
            .delete()
            .eq('id', id);

        if (error) throw error;

        await loadMemories();
    } catch (error) {
        console.error('删除失败:', error);
        alert(`删除失败: ${error.message}`);
    }
};

// HTML 转义
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 启动应用
document.addEventListener('DOMContentLoaded', init);
