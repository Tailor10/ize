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
        "1:595642498247:web:947f6303fb874f4b6892e2",

    measurementId:
        "G-ZGP4RP6PH9"

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

let stopTimeout = null;

let animationFrame = null;



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


const gameSubtitle =
    document.getElementById(
        "gameSubtitle"
    );


const categoryButtons =
    document.querySelectorAll(
        ".category-button"
    );



/* =========================
   KATEGÓRIÁK
========================= */

const categoryNames = {

    magyar:
        "🇭🇺 Magyar",

    kulfoldi:
        "🌍 Külföldi",

    vegyes:
        "🎲 Vegyes"

};


const categoryDescriptions = {

    magyar:
        "Találd ki a magyar dalokat minél kevesebb hallgatásból!",

    kulfoldi:
        "Találd ki a külföldi dalokat minél kevesebb hallgatásból!",

    vegyes:
        "Találd ki a dalokat minél kevesebb hallgatásból!"

};



/* =========================
   KATEGÓRIA KIVÁLASZTÁSA
========================= */

categoryButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                selectedCategory =
                    button.dataset.category;


                categoryButtons.forEach(
                    categoryButton => {

                        categoryButton.classList.remove(
                            "active"
                        );

                    }
                );


                button.classList.add(
                    "active"
                );

            }
        );

    }
);



/* =========================
   NÉV / JÁTÉK INDÍTÁSA
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


function hideNameModal() {

    nameModal.classList.add(
        "hidden"
    );

}


async function savePlayerName() {

    const name =
        playerNameInput.value
            .trim();


    if (
        name.length < 1
    ) {

        alert(
            "Adj meg egy nevet!"
        );

        return;

    }


    playerName =
        name.substring(
            0,
            20
        );


    localStorage.setItem(
        "songlessPlayerName",
        playerName
    );


    localStorage.setItem(
        "songlessCategory",
        selectedCategory
    );


    hideNameModal();


    updateCategoryDisplay();


    await saveScore();


    if (
        songs.length === 0
    ) {

        await loadSongs();

    }
    else {

        resetGame();

        await startRound();

    }

}


function openCategorySelection() {

    stopPlayback();


    playerNameInput.value =
        playerName;


    categoryButtons.forEach(
        button => {

            button.classList.remove(
                "active"
            );


            if (
                button.dataset.category ===
                selectedCategory
            ) {

                button.classList.add(
                    "active"
                );

            }

        }
    );


    showNameModal();

}


function resetGame() {

    score = 0;

    streak = 0;

    round = 1;

    currentSong = null;

    gameFinished = false;


    updateStats();

}



/* =========================
   KATEGÓRIA KIJELZÉSE
========================= */

function updateCategoryDisplay() {

    currentCategoryElement.textContent =
        categoryNames[selectedCategory];


    gameSubtitle.textContent =
        categoryDescriptions[selectedCategory];

}



/* =========================
   ELÉRHETŐ DALOK
========================= */

function getAvailableSongs() {

    if (
        selectedCategory ===
        "vegyes"
    ) {

        return songs;

    }


    return songs.filter(
        song =>
            song.category ===
            selectedCategory
    );

}



/* =========================
   LEADERBOARD MENTÉSE
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
            await getDoc(
                playerRef
            );


        let bestScore =
            score;


        if (
            oldData.exists()
        ) {

            bestScore =
                Math.max(
                    oldData.data().score || 0,
                    score
                );

        }


        await setDoc(
            playerRef,
            {

                name:
                    playerName,

                score:
                    bestScore,

                updatedAt:
                    Date.now()

            },
            {

                merge: true

            }
        );

    }
    catch (error) {

        console.error(
            "Leaderboard mentési hiba:",
            error
        );

    }

}



/* =========================
   LEADERBOARD BETÖLTÉSE
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

            leaderboardList.innerHTML =
                "";


            if (
                snapshot.empty
            ) {

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
                        playerDoc.id ===
                        playerId
                    ) {

                        item.classList.add(
                            "me"
                        );

                    }


                    let medal =
                        `${position}.`;


                    if (
                        position === 1
                    ) {

                        medal = "🥇";

                    }
                    else if (
                        position === 2
                    ) {

                        medal = "🥈";

                    }
                    else if (
                        position === 3
                    ) {

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


                    item.appendChild(
                        rank
                    );


                    item.appendChild(
                        name
                    );


                    item.appendChild(
                        points
                    );


                    leaderboardList.appendChild(
                        item
                    );


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


        if (
            !response.ok
        ) {

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


        /*
        Ha a régi magyar dalaidban
        nincs category mező,
        automatikusan magyar lesz.
        */

        songs =
            songs.map(
                song => {

                    if (
                        !song.category
                    ) {

                        song.category =
                            "magyar";

                    }


                    return song;

                }
            );


        const availableSongs =
            getAvailableSongs();


        if (
            availableSongs.length === 0
        ) {

            message.textContent =
                "❌ Ebben a kategóriában még nincs dal.";

            return;

        }


        await startRound();

    }
    catch (error) {

        console.error(
            error
        );


        message.textContent =
            "❌ Nem sikerült betölteni a daladatbázist.";

    }

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


    if (
        !response.ok
    ) {

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
   LEJÁTSZÁS LEÁLLÍTÁSA
========================= */

function stopPlayback() {

    if (
        stopTimeout !== null
    ) {

        clearTimeout(
            stopTimeout
        );


        stopTimeout = null;

    }


    if (
        animationFrame !== null
    ) {

        cancelAnimationFrame(
            animationFrame
        );


        animationFrame = null;

    }


    if (audio) {

        audio.pause();

        audio.currentTime = 0;

    }

}



/* =========================
   ÚJ KÖR
========================= */

async function startRound() {

    if (isLoading) {

        return;

    }


    isLoading = true;


    try {

        stopPlayback();


        const availableSongs =
            getAvailableSongs();


        if (
            availableSongs.length === 0
        ) {

            throw new Error(
                "Nincs dal ebben a kategóriában."
            );

        }


        let newSong;


        do {

            newSong =
                availableSongs[
                    Math.floor(
                        Math.random() *
                        availableSongs.length
                    )
                ];

        }
        while (

            availableSongs.length > 1 &&

            currentSong &&

            newSong.id ===
            currentSong.id

        );


        currentSong =
            newSong;


        listenTimeIndex = 0;


        listenTime =
            listenTimes[
                listenTimeIndex
            ];


        gameFinished = false;


        guessInput.value =
            "";


        results.innerHTML =
            "";


        message.textContent =
            "🎵 Zene betöltése...";


        message.className =
            "message";


        nextButton.classList.add(
            "hidden"
        );


        nextButton.disabled =
            false;


        playButton.disabled =
            true;


        moreButton.disabled =
            true;


        giveUpButton.disabled =
            true;


        updateStats();

        updateListenTime();

        resetPlaybackProgress();


        const previewUrl =
            await loadPreview(
                currentSong
            );


        audio =
            new Audio(
                previewUrl
            );


        playButton.disabled =
            false;


        moreButton.disabled =
            false;


        giveUpButton.disabled =
            false;


        message.innerHTML = `
            🎧 Hallgass meg
            <strong>${listenTime} mp-et!</strong>
        `;

    }
    catch (error) {

        console.error(
            "Hiba az új körben:",
            error
        );


        message.textContent =
            "❌ Ezt a dalt nem sikerült betölteni.";


        message.className =
            "message wrong";


        nextButton.classList.remove(
            "hidden"
        );

    }
    finally {

        isLoading = false;

    }

}



/* =========================
   LEJÁTSZÁS
========================= */

function playSong() {

    if (

        gameFinished ||

        !audio ||

        isLoading

    ) {

        return;

    }


    stopPlayback();

    resetPlaybackProgress();


    audio.play()
        .then(
            () => {

                function updateTime() {

                    if (!audio) {

                        return;

                    }


                    const current =
                        Math.min(
                            audio.currentTime,
                            listenTime
                        );


                    currentTimeElement.textContent =
                        current.toFixed(1);


                    const percentage =
                        Math.min(

                            (
                                current /
                                listenTime
                            ) * 100,

                            100

                        );


                    progressBar.style.width =
                        `${percentage}%`;


                    if (

                        current <
                        listenTime &&

                        !audio.paused

                    ) {

                        animationFrame =
                            requestAnimationFrame(
                                updateTime
                            );

                    }

                }


                updateTime();

            }
        )
        .catch(
            error => {

                console.error(
                    "Lejátszási hiba:",
                    error
                );

            }
        );


    stopTimeout =
        setTimeout(

            () => {

                if (!audio) {

                    return;

                }


                audio.pause();


                currentTimeElement.textContent =
                    listenTime.toFixed(1);


                progressBar.style.width =
                    "100%";

            },

            listenTime * 1000

        );

}



/* =========================
   KERESÉS
========================= */

function showResults(queryText) {

    results.innerHTML =
        "";


    const search =
        queryText
            .toLowerCase()
            .trim();


    if (
        search.length === 0
    ) {

        return;

    }


    /*
    Csak az aktuális kategória
    dalai között keres.
    */

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
            .slice(
                0,
                6
            );


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


            result.appendChild(
                title
            );


            result.appendChild(
                artist
            );


            result.addEventListener(
                "click",
                () => {

                    selectSong(
                        song
                    );

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

    if (
        gameFinished
    ) {

        return;

    }


    guessInput.value =
        `${selectedSong.artist} – ${selectedSong.title}`;


    results.innerHTML =
        "";


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


    stopPlayback();


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


    message.innerHTML = `

        ❌ Nem ez volt!

        <br>

        Próbálj több időt hallgatni.

    `;


    message.className =
        "message wrong";


    updateStats();

}



/* =========================
   TÖBBET HALLGATOK
========================= */

function increaseListenTime() {

    if (

        gameFinished ||

        isLoading

    ) {

        return;

    }


    stopPlayback();


    if (

        listenTimeIndex <
        listenTimes.length - 1

    ) {

        listenTimeIndex++;


        listenTime =
            listenTimes[
                listenTimeIndex
            ];


        updateListenTime();

        resetPlaybackProgress();


        message.innerHTML = `

            🎧 Most már
            <strong>${listenTime} mp-et</strong>
            hallgathatsz.

        `;


        if (

            listenTimeIndex ===
            listenTimes.length - 1

        ) {

            moreButton.disabled =
                true;

        }

    }

}



/* =========================
   FELADOM
========================= */

function giveUp() {

    if (
        gameFinished
    ) {

        return;

    }


    gameFinished = true;


    streak = 0;


    stopPlayback();


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


    updateStats();

}



/* =========================
   FRISSÍTÉSEK
========================= */

function updateListenTime() {

    listenTimeElement.textContent =
        listenTime;

}


function resetPlaybackProgress() {

    currentTimeElement.textContent =
        "0.0";


    progressBar.style.width =
        "0%";

}


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

startGameButton.addEventListener(
    "click",
    savePlayerName
);


playerNameInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            savePlayerName();

        }

    }
);


changeNameButton.addEventListener(
    "click",
    openCategorySelection
);


changeCategoryButton.addEventListener(
    "click",
    openCategorySelection
);


playButton.addEventListener(
    "click",
    playSong
);


guessInput.addEventListener(
    "input",
    event => {

        showResults(
            event.target.value
        );

    }
);


moreButton.addEventListener(
    "click",
    increaseListenTime
);


giveUpButton.addEventListener(
    "click",
    giveUp
);


nextButton.addEventListener(
    "click",
    async () => {

        if (
            isLoading
        ) {

            return;

        }


        nextButton.disabled =
            true;


        round++;


        updateStats();


        await startRound();


        nextButton.disabled =
            false;

    }
);


guessInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            const firstResult =
                results.querySelector(
                    ".result"
                );


            if (
                firstResult
            ) {

                firstResult.click();

            }

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

            results.innerHTML =
                "";

        }

    }
);



/* =========================
   INDÍTÁS
========================= */

loadLeaderboard();


const savedCategory =
    localStorage.getItem(
        "songlessCategory"
    );


if (

    savedCategory === "magyar" ||

    savedCategory === "kulfoldi" ||

    savedCategory === "vegyes"

) {

    selectedCategory =
        savedCategory;

}


updateCategoryDisplay();


categoryButtons.forEach(
    button => {

        button.classList.remove(
            "active"
        );


        if (

            button.dataset.category ===
            selectedCategory

        ) {

            button.classList.add(
                "active"
            );

        }

    }
);


/*
Mindig megjelenik az indító ablak,
hogy a játékos eldönthesse,
milyen kategóriát szeretne.
*/

showNameModal();
