

// Default music library
const defaultMusic = [
    {
        name: "Love Sosa",
        artist: "Chief Keef",
        src: "../media/a/keef.m4a",
        cover: "../media/black1.JPG",
        album: 'Default',
        year: '2010',
        duration: "",
        addedTime: '04:51',
        addedDate: '12/01/2024',
        genre: ''
    },
    {
        name: "Biltz - yeat",
        artist: "prod. Sky",
        src: "../media/a/bill.m4a",
        cover: "../media/black2.JPG",
        album: 'Default',
        year: '2022',
        duration: '',
        addedTime: '04:51',
        addedDate: '12/01/2024',
        genre: ''
    },
    {
        name: "Paso bem Solto",
        artist: "ATLXS",
        src: "../media/a/ATLXS .mp3",
        cover: "../media/bg.jpg",
        album: 'Default',
        year: '2024',
        duration: '',
        addedTime: '04:51',
        addedDate: '12/01/2024',
         genre: ''
    },
    {
        name: "Middle of the Night",
        artist: "Elley Duhe",
        src: "../media/a/elli.m4a",
        album: "Default",
        cover: "",
        year: '2018',
        duration: "",
        addedTime: '04:51',
        addedDate: '12/01/2024',
        genre: ''
    },
    {
    name: "Fisherrr",
    artist: "Cash Cobain",
    src: "../media/a/fsh.m4a",
    album: "Default",
    cover:'../media/jiji.png',
    year: '2019',
    duration: "",
    addedTime: '04:51',
    addedDate: '12/01/2024',
    genre: '',
},
    {
    name: "Decked",
    artist: "Vaporchrome",
    src: "../media/a/deck.m4a",
    album: "Default",
    cover: "/media/foot.png",
    year: '2019',
    duration: "",
    addedTime: '04:51',
    addedDate: '12/01/2024',
    genre: '',
}
];

// DOM Elements
const audioElement = document.getElementById('The-Audio-Receiver');
const playBtn = document.querySelector('.player');
const prevBtn = document.querySelector('.fa-backward');
const nextBtn = document.querySelector('.fa-forward');
const trackListEl = document.querySelector('.all-music-list');
const currentTimeEl = document.querySelector('.duration.onplay');
const totalTimeEl = document.querySelector('.duration.full');
const progressBar = document.querySelector('.progress-bar .value');
const trackTitle = document.querySelector('.play-song');
const trackArtist = document.querySelector('.play-artist');
const albumArt = document.querySelector('.art-bg .art');
const waveformEl = document.querySelector('.wave-area');
const playerContainer = document.querySelector('.music-player');
const vizButton = document.querySelector('.viz-button');
const expandButton = document.querySelector('.play-left');
const collapseButton = document.querySelector('.top i:nth-child(1)');
const settingsButton = document.querySelector('.top i:last-child');
const trackCounter = document.querySelector('.top .holder h5');
const albumName = document.querySelector('.top .holder h6');


const setBtn = document.querySelectorAll('[data-setup-open]');
const setPage = document.querySelector('#allSettings');

const eqBtn = document.querySelector('#Eqbtn');
const fxPage = document.querySelector('.fxArea');

// Player state
let currentTrackIndex = 0;
let tracks = [...defaultMusic];
let audioContext;
let analyser;
let barData = [];
let barElements = [];
const BAR_COUNT = 130;
let isPlaying = false;
let speakerAnimationEnabled = true;
let inverseScalingEnabled = false;
let showRemainingTime = true;
let longPressTimer;
let waveformGenerationTimeout;
let currentTrackId = 0; // Used to verify correct waveform generation

// Initialize player
function initPlayer() {
    // Set up audio context and analyser
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    
    // Connect audio element to analyser
    const source = audioContext.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    
    // Initialize waveform with empty bars
    initializeWaveform();
    
    // Load first track
    loadTrack(currentTrackIndex);
    
    // Render track list
    renderTrackList();
    
    // Set up event listeners
    setupEventListeners();
    
    // Start visualization loop
    requestAnimationFrame(updateVisualizations);
    
    setupMusicFxControl();
    
    setBtn.forEach(b =>{
        b.onclick = function(){
            setPage.classList.add('open');
        }
    })
    
    setPage.querySelector('.return').onclick = function(){
        setPage.classList.remove('open')
    }
    
          eqBtn.onclick = function(){
            fxPage.classList.add('on');
        }
   fxPage.querySelector('.back').onclick = function(){
        fxPage.classList.remove('on')
    }
}

// Initialize empty waveform
function initializeWaveform() {
    waveformEl.innerHTML = '';
    barElements = [];
    
    for (let i = 0; i < BAR_COUNT; i++) {
        const bar = document.createElement('div');
        bar.classList.add('wave-bar');
        bar.style.height = '4px';
        bar.style.width = '4px';
        bar.style.transition = 'none'; // Remove transition for instant reset
        waveformEl.appendChild(bar);
        barElements.push(bar);
    }
}

// Load a track by index
function loadTrack(index, preventAutoplay = false) {
    if (index < 0 || index >= tracks.length) return;
    
    // Increment track ID for waveform verification
    currentTrackId++;
    const verificationId = currentTrackId;
    
    currentTrackIndex = index;
    const track = tracks[index];
    
    // Immediately reset waveform to minimal state (no transition?)
    barElements.forEach(bar => {
        bar.style.height = '4px';
        bar.style.transition = '';
        bar.classList.remove('active');
    });
    
    // Force reflow to apply immediate reset
    waveformEl.offsetHeight;
    
    audioElement.src = track.src;
    trackTitle.textContent = track.name;
    trackArtist.textContent = track.artist;
    
    // Set album art
    const aTC = track.cover || `/media/bg.jpg`;
    albumArt.style.backgroundImage = `url(${aTC})`;
    
    // Update track counter and album name
    trackCounter.textContent = `${currentTrackIndex + 1}/${tracks.length}`;
    albumName.textContent = track.album;
    
    // Update track count in header
    document.querySelector('.trackCount').textContent = `${tracks.length} Track/s`;
    
    // Update active track in list
    updateActiveTrack();
    
    // Activate player container
    playerContainer.classList.add('active');
    
    // Generate waveform when metadata is loaded
    audioElement.addEventListener('loadedmetadata', () => {
        // Update duration display
        updateDurationDisplay();
        
        // Only generate waveform if this is still the current track
        if (verificationId === currentTrackId) {
            // Delay waveform generation by 400ms to prevent rapid changes
            clearTimeout(waveformGenerationTimeout);
            waveformGenerationTimeout = setTimeout(() => {
                if (verificationId === currentTrackId) {
                    generateWaveform(track.src, verificationId);
                }
            }, 400);
        }
        
        // Auto-play if not prevented
        if (!preventAutoplay) {
            playTrack();
        }
    }, { once: true });
}

// Update duration display based on showRemainingTime flag
function updateDurationDisplay() {
    if (showRemainingTime) {
        totalTimeEl.textContent = `-${formatTime(audioElement.duration - audioElement.currentTime)}`;
    } else {
        totalTimeEl.textContent = formatTime(audioElement.duration);
    }
}

// Play track function
function playTrack() {
    audioElement.play().then(() => {
        playBtn.classList.remove('fa-play');
        playBtn.classList.add('fa-pause');
        isPlaying = true;
        // Resume audio context if it was suspended
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }).catch(e => console.log('Playback failed:', e));
}

// Pause track function
function pauseTrack() {
    audioElement.pause();
    playBtn.classList.remove('fa-pause');
    playBtn.classList.add('fa-play');
    isPlaying = false;
    // Reset album art scale when paused
    resetAlbumArtScale();
}

// Play next track
function playNextTrack() {
    currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
    loadTrack(currentTrackIndex);
}

// Play previous track
function playPrevTrack() {
    currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    loadTrack(currentTrackIndex);
}

// Generate waveform visualization with verification
async function generateWaveform(audioUrl, verificationId) {
    try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const rawData = audioBuffer.getChannelData(0);
        const blockSize = Math.floor(rawData.length / BAR_COUNT);

        barData = [];
        for (let i = 0; i < BAR_COUNT; i++) {
            let sum = 0;
            const blockStart = i * blockSize;
            for (let j = 0; j < blockSize; j++) {
                const sample = rawData[blockStart + j];
                sum += sample * sample;
            }
            const rms = Math.sqrt(sum / blockSize);
            barData.push(rms);
        }

        // Only render if this is still the current track
        if (verificationId === currentTrackId) {
            renderWaveform();
        }
    } catch (error) {
        console.error('Error generating waveform:', error);
        // Create a default waveform if there's an error
        barData = Array(BAR_COUNT).fill(0.1).map((_, i) => 
            Math.abs(Math.sin(i / 5)) * 0.5 + Math.random() * 0.1
        );
        if (verificationId === currentTrackId) {
            renderWaveform();
        }
    }
}

// Render waveform bars with smooth transitions
function renderWaveform() {
    // First render without transition
    barElements.forEach((bar, i) => {
        bar.style.height = '2px';
        bar.style.transition = 'none';
    });
    
    // Force reflow
    waveformEl.offsetHeight;
    
    // Now apply the heights with transition
    barElements.forEach((bar, i) => {
        const height = Math.max(2, barData[i] * 150);
        bar.style.height = `${height}px`;
        bar.style.transition = 'height 0.3s ease';
    });
}

// Update visualizations (waveform progress and album art animation)
function updateVisualizations() {
    if (!audioElement.paused) {
    // Update waveform progress
    if (audioElement.duration && !isNaN(audioElement.duration)) {
        const progressIndex = Math.floor((audioElement.currentTime / audioElement.duration) * BAR_COUNT);
        barElements.forEach((bar, index) => {
            bar.classList.toggle('active', index <= progressIndex);
        });
    }

    // Update time displays
    currentTimeEl.textContent = formatTime(audioElement.currentTime);
    updateDurationDisplay();
    
    // Update progress bar
    if (audioElement.duration) {
        const progressPercent = (audioElement.currentTime / audioElement.duration) * 100;
        progressBar.style.width = `${progressPercent}%`;
    }

        // Album art animation if enabled
        if (speakerAnimationEnabled && !audioElement.paused) {
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);
            
            // Calculate average frequency for animation
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            let scale;
            
            if (inverseScalingEnabled) {
                // Inverse scaling (quieter = bigger)
                scale = 1.3 - (average / 255) * 0.4; // Scale between 0.9 and 1.3
            } else {
                // Normal scaling (louder = bigger)
                scale = 1 + (average / 255) * 0.4; // Scale between 0.9 and 1.3
            }
            
            // Apply animation to album art
            albumArt.style.transform = `scale(${scale})`;
        }
    }
    
    requestAnimationFrame(updateVisualizations);
}

// Format time (seconds to MM:SS)
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// Render track list with real durations
function renderTrackList() {
    trackListEl.innerHTML = '';
    tracks.forEach((track, index) => {
        const trackItem = document.createElement('div');
        trackItem.classList.add('track');
        if (index === currentTrackIndex) {
            trackItem.classList.add('onplaynow');
        }
        
        // Default duration until loaded
        const durationDisplay = track.duration || '0:00';
        const trackCover = track.cover || '/media/bg.jpg';
        trackItem.innerHTML = `
            <div class="side left">
                <div class="img-handler">
                    <div class="bgfx" style="background-image: url(${trackCover})"></div>
                    <img src="${trackCover}"/>
                </div>
                <div class="track-info">
                    <h4 class="s-name">${track.name}</h4>
                    <h6 class="s-artist">${track.artist}</h6>
                    <h6 class="more-of-track">${track.album} • ${track.year}</h6>
                </div>
            </div>
            <div class="side right">
                <div class="dat">
                    <h6 class="duration">${durationDisplay}</h6>
                    <i class="fa fa-skull"></i>
                </div>
                <i class="fa fa-ellipsis-v"></i>
            </div>
        `;
        
        trackItem.addEventListener('click', () => {
            currentTrackIndex = index;
            loadTrack(currentTrackIndex);
            playTrack();
        });
        
        trackListEl.appendChild(trackItem);
    });
}

// Update active track in list
function updateActiveTrack() {
    const trackItems = document.querySelectorAll('.track');
    trackItems.forEach((item, index) => {
        if (index === currentTrackIndex) {
            item.classList.add('onplaynow');
        } else {
            item.classList.remove('onplaynow');
        }
    });
}

// Toggle remaining time display
function toggleRemainingTime() {
    showRemainingTime = !showRemainingTime;
    updateDurationDisplay();
}

// Reset album art to normal scale
function resetAlbumArtScale() {
    albumArt.style.transform = 'scale(1)';
    albumArt.style.boxShadow = 'none';
}

// Toggle speaker animation
function toggleSpeakerAnimation() {
    speakerAnimationEnabled = !speakerAnimationEnabled;
    if (!speakerAnimationEnabled) {
        resetAlbumArtScale();
    }
    updateVizButtonState();
}

// Update visualization button state
function updateVizButtonState() {
    if (speakerAnimationEnabled) {
        vizButton.style.opacity = '1';
        vizButton.style.pointerEvents = 'auto';
        if (inverseScalingEnabled) {
            vizButton.classList.add('active');
        } else {
            vizButton.classList.remove('active');
        }
    } else {
        vizButton.style.opacity = '0.6';
        vizButton.style.pointerEvents = 'none';
        vizButton.classList.remove('active');
    }
}

// Handle long press events
function startLongPress(action, duration = 4000) {
    longPressTimer = setTimeout(() => {
        action();
        isLongPressing = false;
    }, duration);
}

function cancelLongPress() {
    clearTimeout(longPressTimer);
    isLongPressing = false;
}

// Set up event listeners
function setupEventListeners() {
    // Play/Pause button
    playBtn.addEventListener('click', () => {
        if (audioElement.paused) {
            playTrack();
        } else {
            pauseTrack();
        }
    });

    // Previous button
    prevBtn.addEventListener('click', playPrevTrack);

    // Next button
    nextBtn.addEventListener('click', playNextTrack);

    // Time update
    audioElement.addEventListener('timeupdate', () => {
        currentTimeEl.textContent = formatTime(audioElement.currentTime);
        updateDurationDisplay();
        
        // Update progress bar
        if (audioElement.duration) {
            const progressPercent = (audioElement.currentTime / audioElement.duration) * 100;
            progressBar.style.width = `${progressPercent}%`;
        }
    });

    // When track ends, play next one
    audioElement.addEventListener('ended', playNextTrack);

    // Click on waveform to seek
    waveformEl.addEventListener('click', (e) => {
        if (audioElement.duration) {
            const rect = waveformEl.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            audioElement.currentTime = percent * audioElement.duration;
        }
    });

    // Expand/collapse player
    expandButton.addEventListener('click', () => {
        playerContainer.classList.add('expand');
    });

    collapseButton.addEventListener('click', () => {
        playerContainer.classList.remove('expand');
    });

    // Long press settings button to toggle animation
    settingsButton.addEventListener('mousedown', () => {
        isLongPressing = true;
        startLongPress(toggleSpeakerAnimation);
    });

    settingsButton.addEventListener('mouseup', cancelLongPress);
    settingsButton.addEventListener('mouseleave', cancelLongPress);

    // Touch support for mobile
    settingsButton.addEventListener('touchstart', () => {
        isLongPressing = true;
        startLongPress(toggleSpeakerAnimation);
    });

    settingsButton.addEventListener('touchend', cancelLongPress);

    // Visualization button
    vizButton.addEventListener('click', () => {
        if (speakerAnimationEnabled) {
            inverseScalingEnabled = !inverseScalingEnabled;
            updateVizButtonState();
        }
    });

    // Toggle remaining time display on total time click
    totalTimeEl.addEventListener('click', toggleRemainingTime);

    // Long press time displays for seeking
    currentTimeEl.addEventListener('mousedown', () => startLongPress(() => seek(-15), 200));
    currentTimeEl.addEventListener('mouseup', cancelLongPress);
    currentTimeEl.addEventListener('mouseleave', cancelLongPress);
    totalTimeEl.addEventListener('mousedown', () => startLongPress(() => seek(15), 200));
    totalTimeEl.addEventListener('mouseup', cancelLongPress);
    totalTimeEl.addEventListener('mouseleave', cancelLongPress);

    // Touch support for mobile seeking
    currentTimeEl.addEventListener('touchstart', () => startLongPress(() => seek(-15), 200));
    currentTimeEl.addEventListener('touchend', cancelLongPress);
    totalTimeEl.addEventListener('touchstart', () => startLongPress(() => seek(15), 200));
    totalTimeEl.addEventListener('touchend', cancelLongPress);
}

//Equalizer, 3d reverbs and boost
  function setupMusicFxControl(){
    // Get all slider handlers
    const presetDrops = document.querySelectorAll('.presetdrop');
   const allEqBtn = document.getElementById('EqCheck');
    const eqPages = document.querySelectorAll('.fxArea .innerPage');
    const nBar = document.querySelector('.fxArea .navigate');
    
    
   presetDrops.forEach(drop =>{

       const dropBtn = drop.querySelector('.preset-dropBtn');
       const presets = drop.querySelector('.presets');
       dropBtn.onclick = function(){
           
           presets.style.transform = 'scale(1)';
           presets.style.opacity = '1';
           setTimeout(() =>{
 if(presets.style.transform === 'scale(1)'){
           document.body.ondblclick = function(){
               presets.style.transform = 'scale(0)';
           presets.style.opacity = '0';
           }
 } }, 800);
       }
       
   });
    
    
    nBar.style.filter = 'grayscale(1) brightness(0.4)';
    nBar.style.pointerEvents = 'none';
    
    eqPages.forEach(p =>{
        
        allEqBtn.addEventListener('change', (e) => {
        if (!e.target.checked) {
            // When disabling, reset album art scale
                
   presetDrops.forEach(drop =>{

       const dropBtn = drop.querySelector('.preset-dropBtn');
       const presets = drop.querySelector('.presets');

           presets.style.transform = 'scale(0)';
           presets.style.opacity = '0';
   });
    
         p.classList.remove('active');
         nBar.style.filter = 'grayscale(1) brightness(0.4)';
         nBar.style.pointerEvents = 'none';
        
        } else {
           p.classList.add('active');
           nBar.style.filter = 'grayscale(0) brightness(1)';
           nBar.style.pointerEvents = 'auto';
        }
    })
    
    });
    
   
    
    
    const handlers = document.querySelectorAll('.fxArea .holder .handler');
    
    handlers.forEach(handler => {
    const isHorizontal = handler.classList.contains('horizontal');
    const dragger = handler.querySelector('.dragger');
    const cover = handler.querySelector('.cover');
    const innerValue = handler.querySelector('.inner-value');
    
    let isDragging = false;
    
    // Function to calculate position based on constraints
    function calculatePosition(clientPos) {
        const rect = cover.getBoundingClientRect();
        let pos;
        
        if (isHorizontal) {
            pos = (clientPos - rect.left) / rect.width;
        } else {
            pos = 1 - (clientPos - rect.top) / rect.height; // Invert for vertical
        }
        
        // Apply constraints (5% to 98%)
        pos = Math.max(0.01, Math.min(0.95, pos));
        
        return pos;
    }
    
    // Function to update slider position
    function updateSliderPosition(pos) {
        // Calculate the visual position (constrained)
        const constrainedPos = pos;
        
        // Calculate the output value (0-100% mapped from 5-98%)
        const outputValue = (constrainedPos - 0.01) / (0.95 - 0.01) * 100;
        
        if (isHorizontal) {
            // Horizontal slider
            const draggerPos = constrainedPos * 100;
            dragger.style.left = `calc(${draggerPos + 3}% - ${dragger.offsetWidth / 2}px)`;
            innerValue.style.width = `${draggerPos + 3}%`;
        } else {
            // Vertical slider
            const draggerPos = constrainedPos * 100;
            dragger.style.bottom = `${draggerPos}%`;
            innerValue.style.height = `${draggerPos}%`;
        }
        
        console.log(`Slider value: ${outputValue.toFixed(1)}%`);
    }
    
    // Mouse/touch down event
    function startDrag(e) {
        isDragging = true;
        const clientPos = isHorizontal ? e.clientX : e.clientY;
        const pos = calculatePosition(clientPos);
        updateSliderPosition(pos);
        e.preventDefault();
    }
    
    // Mouse/touch move event
    function drag(e) {
        if (!isDragging) return;
        const clientPos = isHorizontal ?
            (e.clientX || e.touches[0].clientX) :
            (e.clientY || e.touches[0].clientY);
        const pos = calculatePosition(clientPos);
        updateSliderPosition(pos);
        e.preventDefault();
    }
    
    // Mouse/touch up event
    function endDrag() {
        isDragging = false;
    }
    
    // Initialize slider position
    updateSliderPosition(0.3); // Start at 30%
    
    // Add event listeners for mouse
    dragger.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    
    // Add event listeners for touch
    dragger.addEventListener('touchstart', startDrag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('touchend', endDrag);
    
    // Add click event for the track
    cover.addEventListener('click', function(e) {
        const clientPos = isHorizontal ? e.clientX : e.clientY;
        const pos = calculatePosition(clientPos);
        updateSliderPosition(pos);
    });
    });
    


}





// Initialize the player when the page loads
window.addEventListener('load', initPlayer); 
