import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";

import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    onSnapshot,
    collection,
    query,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";


/* =========================
   FIREBASE
========================= */

const firebaseConfig = {
    apiKey: "AIzaSyC75fxDCjIYGZxmN2DPWGHnJ1tBwEDxMkA",

    authDomain:
        "song-66ea4.firebaseapp.com",

    projectId:
        "song-66ea4",

    storageBucket:
        "song-66ea4.firebasestorage.app",

    messagingSenderId:
        "595642498247",

    appId:
        "1:595642498247:web:947f6303fb874f4b6892e2"
};


const firebaseApp =
    initializeApp(firebaseConfig);


const db =
    getFirestore(firebaseApp);


/* =========================
   JÁTÉK VÁLTOZÓK
========================= */

let songs = [];

let currentSong = null;

let audio = null;

let score = 0;

let streak = 0;

let round = 1;

let selectedCategory = "vegyes";


const listenTimes = [
    0.5,
    1,
    2,
    4,
    8,
    15
];


let listenTimeIndex = 0;

let listenTime =
    listenTimes[listenTimeIndex];


let gameFinished = false;

let isLoading = false;

let isPlaying = false;

let stopTimeout = null;

let animationFrame = null;

let playStartedAt = 0;

let pausedElapsed = 0;


/* =========================
   JÁTÉKOS
========================= */

let playerName =
    localStorage.getItem(
        "songlessPlayerName"
    ) || "";


let playerId =
    localStorage.getItem(
        "songlessPlayerId"
    );


if (!playerId) {

    playerId =
        crypto.randomUUID();

    localStorage.setItem(
        "songlessPlayerId",
        playerId
    );
}


/* =========================
   HTML ELEMEK
========================= */

const playButton =
    document.getElementById(
        "playButton"
    );

const guessInput =
    document.getElementById(
        "guessInput"
    );

const results =
    document.getElementById(
        "results"
    );

const moreButton =
    document.getElementById(
        "moreButton"
    );

const giveUpButton =
    document.getElementById(
        "giveUpButton"
    );

const nextButton =
    document.getElementById(
        "nextButton"
    );

const message =
    document.getElementById(
        "message"
    );

const listenTimeElement =
    document.getElementById(
        "listenTime"
    );

const currentTimeElement =
    document.getElementById(
        "currentTime"
    );

const progressBar =
    document.getElementById(
        "progressBar"
    );

const scoreElement =
    document.getElementById(
        "score"
    );

const streakElement =
    document.getElementById(
        "streak"
    );

const roundElement =
    document.getElementById(
        "round"
    );

const leaderboardList =
    document.getElementById(
        "leaderboardList"
    );

const nameModal =
    document.getElementById(
        "nameModal"
    );

const playerNameInput =
    document.getElementById(
        "playerNameInput"
    );

const startGameButton =
    document.getElementById(
        "startGameButton"
    );

const changeNameButton =
    document.getElementById(
        "changeNameButton"
    );

const changeCategoryButton =
    document.getElementById(
        "changeCategoryButton"
    );

const currentCategoryElement =
    document.getElementById(
        "currentCategory"
    );

const categoryButtons =
    document.querySelectorAll(
        ".category-button"
    );

const volumeSlider =
    document.getElementById(
        "volumeSlider"
    );

const volumeValue =
    document.getElementById(
        "volumeValue"
    );

const volumeIcon =
    document.getElementById(
        "volumeIcon"
    );


/* =========================
   NÉV ABLAK
========================= */

function showNameModal() {

    playerNameInput.value =
        playerName;

    nameModal.classList.remove(
        "hidden"
    );

    setTimeout(
        () => {
            playerNameInput.focus();
        },
        100
    );
}


async function savePlayerName() {

    const name =
        playerNameInput.value.trim();


    if (name.length < 1) {

        alert(
            "Adj meg egy nevet!"
        );

        return;
    }


    playerName =
        name.substring(0, 20);


    localStorage.setItem(
        "songlessPlayerName",
        playerName
    );


    nameModal.classList.add(
        "hidden"
    );


    await saveScore();


    if (songs.length === 0) {

        await loadSongs();

    }
}


startGameButton.addEventListener(
    "click",
    savePlayerName
);


playerNameInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {
            savePlayerName();
        }

    }
);


changeNameButton.addEventListener(
    "click",
    showNameModal
);


/* =========================
   KATEGÓRIA
========================= */

function updateCategoryText() {

    const categoryNames = {
        magyar: "🇭🇺 Magyar",
        kulfoldi: "🌍 Külföldi",
        vegyes: "🎲 Vegyes"
    };


    currentCategoryElement.textContent =
        categoryNames[selectedCategory];
}


categoryButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                categoryButtons.forEach(
                    item =>
                        item.classList.remove(
                            "active"
                        )
                );


                button.classList.add(
                    "active"
                );


                selectedCategory =
                    button.dataset.category;


                updateCategoryText();

            }
        );

    }
);


changeCategoryButton.addEventListener(
    "click",
    () => {

        stopPlayback(true);

        gameFinished = false;

        nameModal.classList.remove(
            "hidden"
        );

    }
);


/* =========================
   RANGLISTA MENTÉSE
========================= */

async function saveScore() {

    if (!playerName) {
        return;
    }


    try {

        const playerRef =
            doc(
                db,
                "leaderboard",
                playerId
            );


        const oldData =
            await getDoc(playerRef);


        let bestScore =
            score;


        if (oldData.exists()) {

            bestScore =
                Math.max(
                    oldData.data().score || 0,
                    score
                );

        }


        await setDoc(
            playerRef,
            {
                name: playerName,
                score: bestScore
            },
            {
                merge: true
            }
        );

    }
    catch (error) {

        console.error(
            "Mentési hiba:",
            error
        );

    }
}


/* =========================
   LEADERBOARD BETÖLTÉS
========================= */

function loadLeaderboard() {

    const leaderboardQuery =
        query(
            collection(
                db,
                "leaderboard"
            ),

            orderBy(
                "score",
                "desc"
            ),

            limit(10)
        );


    onSnapshot(

        leaderboardQuery,

        snapshot => {

            leaderboardList.innerHTML = "";


            if (snapshot.empty) {

                leaderboardList.innerHTML = `
                    <div class="leaderboard-empty">
                        Még nincs játékos a ranglistán.
                    </div>
                `;

                return;
            }


            let position = 1;


            snapshot.forEach(
                playerDoc => {

                    const player =
                        playerDoc.data();


                    const item =
                        document.createElement(
                            "div"
                        );


                    item.className =
                        "leaderboard-item";


                    if (
                        playerDoc.id === playerId
                    ) {

                        item.classList.add(
                            "me"
                        );

                    }


                    let medal =
                        `${position}.`;


                    if (position === 1) {
                        medal = "🥇";
                    }
                    else if (position === 2) {
                        medal = "🥈";
                    }
                    else if (position === 3) {
                        medal = "🥉";
                    }


                    const rank =
                        document.createElement(
                            "div"
                        );

                    rank.className =
                        "leaderboard-rank";

                    rank.textContent =
                        medal;


                    const name =
                        document.createElement(
                            "div"
                        );

                    name.className =
                        "leaderboard-name";

                    name.textContent =
                        player.name;


                    const points =
                        document.createElement(
                            "div"
                        );

                    points.className =
                        "leaderboard-score";

                    points.textContent =
                        `${player.score} pont`;


                    item.appendChild(rank);
                    item.appendChild(name);
                    item.appendChild(points);

                    leaderboardList.appendChild(item);

                    position++;

                }
            );

        },

        error => {

            console.error(
                "Leaderboard hiba:",
                error
            );


            leaderboardList.innerHTML = `
                <div class="leaderboard-empty">
                    Nem sikerült betölteni a ranglistát.
                </div>
            `;

        }

    );

}


/* =========================
   DALOK BETÖLTÉSE
========================= */

async function loadSongs() {

    try {

        const response =
            await fetch(
                "./data/songs.json"
            );


        if (!response.ok) {

            throw new Error(
                "Nem sikerült betölteni a daladatbázist."
            );

        }


        songs =
            await response.json();


        if (
            !Array.isArray(songs) ||
            songs.length === 0
        ) {

            throw new Error(
                "A daladatbázis üres."
            );

        }


        songs =
            songs.map(
                song => {

                    if (!song.category) {
                        song.category = "magyar";
                    }

                    return song;

                }
            );


        const availableSongs =
            getAvailableSongs();


        if (availableSongs.length === 0) {

            message.textContent =
                "❌ Ebben a kategóriában még nincs dal.";

            return;
        }


        await startRound();

    }
    catch (error) {

        console.error(error);

        message.textContent =
            "❌ Nem sikerült betölteni a daladatbázist.";

    }

}


/* =========================
   ELÉRHETŐ DALOK
========================= */

function getAvailableSongs() {

    if (selectedCategory === "vegyes") {

        return songs;

    }


    return songs.filter(
        song =>
            song.category === selectedCategory
    );

}


/* =========================
   ZENE ELŐNÉZET
========================= */

async function loadPreview(song) {

    const queryText =
        `${song.artist} ${song.title}`;


    const url =
        "https://itunes.apple.com/search?" +
        `term=${encodeURIComponent(queryText)}` +
        "&country=HU" +
        "&media=music" +
        "&entity=song" +
        "&limit=10";


    const response =
        await fetch(url);


    if (!response.ok) {

        throw new Error(
            "Nem sikerült lekérni a zenét."
        );

    }


    const data =
        await response.json();


    const result =
        data.results.find(
            item =>
                item.previewUrl
        );


    if (!result) {

        throw new Error(
            "Nincs zenei előnézet."
        );

    }


    return result.previewUrl;

}


/* =========================
   HANGERŐ
========================= */

function updateVolume() {

    const volume =
        Number(volumeSlider.value);


    volumeValue.textContent =
        `${volume}%`;


    if (volume === 0) {
        volumeIcon.textContent = "🔇";
    }
    else if (volume < 40) {
        volumeIcon.textContent = "🔉";
    }
    else {
        volumeIcon.textContent = "🔊";
    }


    if (audio) {

        audio.volume =
            volume / 100;

    }


    localStorage.setItem(
        "songlessVolume",
        volume
    );
}


const savedVolume =
    localStorage.getItem(
        "songlessVolume"
    );


if (savedVolume !== null) {

    volumeSlider.value =
        savedVolume;

}


updateVolume();


volumeSlider.addEventListener(
    "input",
    updateVolume
);


/* =========================
   LEJÁTSZÁS LEÁLLÍTÁSA
========================= */

function clearPlaybackTimers() {

    if (stopTimeout !== null) {

        clearTimeout(stopTimeout);

        stopTimeout = null;

    }


    if (animationFrame !== null) {

        cancelAnimationFrame(
            animationFrame
        );

        animationFrame = null;

    }

}


function stopPlayback(reset = false) {

    clearPlaybackTimers();


    if (audio) {

        audio.pause();


        if (reset) {
            audio.currentTime = 0;
        }

    }


    isPlaying = false;

    playButton.textContent = "▶";


    if (reset) {

        pausedElapsed = 0;

        currentTimeElement.textContent =
            "0.0";

        progressBar.style.width =
            "0%";

    }

}


/* =========================
   IDŐ FRISSÍTÉSE
========================= */

function updatePlaybackUI() {

    if (!isPlaying) {
        return;
    }


    const elapsed =
        pausedElapsed +
        (
            performance.now() -
            playStartedAt
        ) / 1000;


    const clamped =
        Math.min(
            elapsed,
            listenTime
        );


    currentTimeElement.textContent =
        clamped.toFixed(1);


    progressBar.style.width =
        `${(clamped / listenTime) * 100}%`;


    if (clamped >= listenTime) {

        pausedElapsed =
            listenTime;


        stopPlayback(false);

        return;
    }


    animationFrame =
        requestAnimationFrame(
            updatePlaybackUI
        );

}


/* =========================
   LEJÁTSZÁS / SZÜNET
========================= */

async function togglePlayback() {

    if (
        !audio ||
        gameFinished ||
        isLoading
    ) {
        return;
    }


    if (isPlaying) {

        const elapsed =
            pausedElapsed +
            (
                performance.now() -
                playStartedAt
            ) / 1000;


        pausedElapsed =
            Math.min(
                elapsed,
                listenTime
            );


        stopPlayback(false);

        currentTimeElement.textContent =
            pausedElapsed.toFixed(1);


        progressBar.style.width =
            `${(pausedElapsed / listenTime) * 100}%`;

        return;
    }


    if (pausedElapsed >= listenTime) {

        pausedElapsed = 0;

        audio.currentTime = 0;

    }


    try {

        isPlaying = true;

        playButton.textContent = "⏸";


        playStartedAt =
            performance.now();


        await audio.play();


        updatePlaybackUI();


        const remaining =
            Math.max(
                0,
                listenTime -
                pausedElapsed
            );


        stopTimeout =
            setTimeout(
                () => {

                    pausedElapsed =
                        listenTime;


                    stopPlayback(false);


                    currentTimeElement.textContent =
                        listenTime.toFixed(1);


                    progressBar.style.width =
                        "100%";

                },
                remaining * 1000
            );

    }
    catch (error) {

        console.error(
            "Lejátszási hiba:",
            error
        );


        stopPlayback(false);

        message.textContent =
            "❌ Nem sikerült elindítani a zenét.";

    }

}


/* =========================
   ÚJ KÖR
========================= */

async function startRound() {

    stopPlayback(true);

    isLoading = true;

    gameFinished = false;

    listenTimeIndex = 0;

    listenTime =
        listenTimes[
            listenTimeIndex
        ];


    listenTimeElement.textContent =
        listenTime;


    currentTimeElement.textContent =
        "0.0";


    progressBar.style.width =
        "0%";


    guessInput.value =
        "";


    results.innerHTML =
        "";


    nextButton.classList.add(
        "hidden"
    );


    moreButton.disabled =
        false;


    giveUpButton.disabled =
        false;


    message.textContent =
        "🎵 Zene betöltése...";


    playButton.disabled =
        true;


    const availableSongs =
        getAvailableSongs();


    currentSong =
        availableSongs[
            Math.floor(
                Math.random() *
                availableSongs.length
            )
        ];


    try {

        const previewUrl =
            await loadPreview(
                currentSong
            );


        audio =
            new Audio(
                previewUrl
            );


        audio.volume =
            Number(
                volumeSlider.value
            ) / 100;


        audio.addEventListener(
            "ended",
            () => {

                stopPlayback(false);

            }
        );


        playButton.disabled =
            false;


        message.textContent =
            "▶ Nyomd meg a lejátszás gombot!";

    }
    catch (error) {

        console.error(error);


        message.textContent =
            "❌ Ehhez a dalhoz nem található zenei előnézet.";

    }
    finally {

        isLoading = false;

    }

}


/* =========================
   TÖBBET HALLGATOK
========================= */

moreButton.addEventListener(
    "click",
    () => {

        if (gameFinished) {
            return;
        }


        if (
            listenTimeIndex <
            listenTimes.length - 1
        ) {

            stopPlayback(true);


            listenTimeIndex++;


            listenTime =
                listenTimes[
                    listenTimeIndex
                ];


            listenTimeElement.textContent =
                listenTime;


            message.textContent =
                `🎧 Most már ${listenTime} másodpercet hallgathatsz.`;

        }
        else {

            moreButton.disabled =
                true;

        }

    }
);


/* =========================
   KERESÉS
========================= */

function showResults(queryText) {

    results.innerHTML = "";


    const search =
        queryText
            .toLowerCase()
            .trim();


    if (search.length === 0) {
        return;
    }


    const availableSongs =
        getAvailableSongs();


    const matches =
        availableSongs
            .filter(
                song => {

                    const text =
                        `${song.artist} ${song.title}`
                            .toLowerCase();


                    return text.includes(
                        search
                    );

                }
            )
            .slice(0, 6);


    matches.forEach(
        song => {

            const result =
                document.createElement(
                    "div"
                );


            result.className =
                "result";


            const title =
                document.createElement(
                    "strong"
                );

            title.textContent =
                song.title;


            const artist =
                document.createElement(
                    "span"
                );

            artist.className =
                "result-artist";

            artist.textContent =
                song.artist;


            result.appendChild(title);
            result.appendChild(artist);


            result.addEventListener(
                "click",
                () => {

                    selectSong(song);

                }
            );


            results.appendChild(
                result
            );

        }
    );

}


/* =========================
   DAL KIVÁLASZTÁSA
========================= */

function selectSong(selectedSong) {

    if (gameFinished) {
        return;
    }


    guessInput.value =
        `${selectedSong.artist} – ${selectedSong.title}`;


    results.innerHTML = "";


    if (
        selectedSong.id ===
        currentSong.id
    ) {

        correctAnswer();

    }
    else {

        wrongAnswer();

    }

}


/* =========================
   HELYES VÁLASZ
========================= */

async function correctAnswer() {

    gameFinished = true;

    stopPlayback(false);


    const pointsTable = [
        100,
        80,
        60,
        40,
        20,
        10
    ];


    const points =
        pointsTable[
            listenTimeIndex
        ];


    score += points;

    streak++;


    message.innerHTML = `
        <div class="answer-result">

            <div class="answer-status">
                🎉 Helyes válasz!
            </div>

            <div class="answer-song">
                ${currentSong.artist}
                –
                ${currentSong.title}
            </div>

            <div class="answer-points">
                +${points} pont
            </div>

        </div>
    `;


    message.className =
        "message correct";


    nextButton.classList.remove(
        "hidden"
    );


    updateStats();

    await saveScore();

}


/* =========================
   ROSSZ VÁLASZ
========================= */

function wrongAnswer() {

    streak = 0;

    updateStats();


    message.innerHTML = `
        ❌ Nem ez volt!
        <br>
        Próbálj több időt hallgatni.
    `;


    message.className =
        "message wrong";

}


/* =========================
   FELADOM
========================= */

giveUpButton.addEventListener(
    "click",
    () => {

        if (gameFinished) {
            return;
        }


        gameFinished = true;

        stopPlayback(false);

        streak = 0;

        updateStats();


        message.innerHTML = `
            <div class="answer-result">

                <div class="answer-status">
                    😢 A helyes válasz:
                </div>

                <div class="answer-song">
                    ${currentSong.artist}
                    –
                    ${currentSong.title}
                </div>

            </div>
        `;


        message.className =
            "message wrong";


        nextButton.classList.remove(
            "hidden"
        );

    }
);


/* =========================
   KÖVETKEZŐ DAL
========================= */

nextButton.addEventListener(
    "click",
    async () => {

        round++;

        updateStats();

        await startRound();

    }
);


/* =========================
   STATISZTIKÁK
========================= */

function updateStats() {

    scoreElement.textContent =
        score;


    streakElement.textContent =
        `${streak} 🔥`;


    roundElement.textContent =
        round;

}


/* =========================
   ESEMÉNYEK
========================= */

playButton.addEventListener(
    "click",
    togglePlayback
);


guessInput.addEventListener(
    "input",
    () => {

        if (!gameFinished) {

            showResults(
                guessInput.value
            );

        }

    }
);


guessInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            results.innerHTML = "";

            guessInput.blur();

        }

    }
);


document.addEventListener(
    "click",
    event => {

        if (
            !event.target.closest(
                ".search-container"
            )
        ) {

            results.innerHTML = "";

        }

    }
);


/* =========================
   INDÍTÁS
========================= */

updateStats();

updateCategoryText();

loadLeaderboard();


if (playerName) {

    nameModal.classList.add(
        "hidden"
    );

    loadSongs();

}
