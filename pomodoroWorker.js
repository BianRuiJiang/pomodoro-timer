let timer;
let timeRemaining;
let isRunning = false;
let isWorking = true;
let isLongBreak = false;
let completedPomodoros = 0;
let completedCycles = 0;
let totalCompletedPomodoros = 0;
let pendingPomodoroIncrease = false;

let WORK_TIME, SHORT_BREAK, LONG_BREAK, POMODOROS_PER_CYCLE;
let dailyResetTimer;

self.onmessage = function (e) {
    const {
        type,
        data
    } = e.data;

    switch (type) {
        case 'init':
            WORK_TIME = data.workTime * 60;
            SHORT_BREAK = data.shortBreak * 60;
            LONG_BREAK = data.longBreak * 60;
            POMODOROS_PER_CYCLE = data.pomodorosPerCycle;
            timeRemaining = WORK_TIME;
            completedPomodoros = data.completedPomodoros || 0;
            completedCycles = data.completedCycles || 0;
            totalCompletedPomodoros = data.totalCompletedPomodoros || 0;

            setupDailyReset();

            postMessage({
                type: 'update',
                timeRemaining,
                isRunning,
                isWorking,
                isLongBreak,
                completedPomodoros,
                completedCycles,
                totalCompletedPomodoros
            });
            break;

        case 'start':
            if (!isRunning) {
                timer = setInterval(tick, 1000);
                isRunning = true;
                postMessage({
                    type: 'update',
                    timeRemaining,
                    isRunning,
                    isWorking,
                    isLongBreak,
                    completedPomodoros,
                    completedCycles,
                    totalCompletedPomodoros
                });
            }
            break;

        case 'pause':
            if (isRunning) {
                clearInterval(timer);
                isRunning = false;
                postMessage({
                    type: 'update',
                    timeRemaining,
                    isRunning,
                    isWorking,
                    isLongBreak,
                    completedPomodoros,
                    completedCycles,
                    totalCompletedPomodoros
                });
            }
            break;

        case 'reset':
            clearInterval(timer);
            isRunning = false;
            isWorking = true;
            isLongBreak = false;
            timeRemaining = WORK_TIME;
            completedPomodoros = 0;
            pendingPomodoroIncrease = false;

            postMessage({
                type: 'update',
                timeRemaining,
                isRunning,
                isWorking,
                isLongBreak,
                completedPomodoros,
                completedCycles,
                totalCompletedPomodoros
            });
            break;

        case 'resetAll':
            clearInterval(timer);
            isRunning = false;
            isWorking = true;
            isLongBreak = false;
            timeRemaining = WORK_TIME;
            completedPomodoros = 0;
            completedCycles = 0;
            totalCompletedPomodoros = 0;
            pendingPomodoroIncrease = false;

            postMessage({
                type: 'update',
                timeRemaining,
                isRunning,
                isWorking,
                isLongBreak,
                completedPomodoros,
                completedCycles,
                totalCompletedPomodoros
            });

            postMessage({
                type: 'statsReset'
            });
            break;

        case 'updateSettings':
            WORK_TIME = data.workTime * 60;
            SHORT_BREAK = data.shortBreak * 60;
            LONG_BREAK = data.longBreak * 60;
            POMODOROS_PER_CYCLE = data.pomodorosPerCycle;
            if (!isRunning) {
                timeRemaining = isWorking ? WORK_TIME : (isLongBreak ? LONG_BREAK : SHORT_BREAK);
                postMessage({
                    type: 'update',
                    timeRemaining,
                    isRunning,
                    isWorking,
                    isLongBreak,
                    completedPomodoros,
                    completedCycles,
                    totalCompletedPomodoros
                });
            }
            break;
    }
};

function tick() {
    timeRemaining--;
    if (timeRemaining % 5 === 0 || timeRemaining <= 0) {
        postMessage({
            type: 'update',
            timeRemaining,
            isRunning,
            isWorking,
            isLongBreak,
            completedPomodoros,
            completedCycles,
            totalCompletedPomodoros
        });
    }

    if (timeRemaining <= 0) {
        clearInterval(timer);
        isRunning = false;
        // 先发送 'finished' 消息，记录当前状态
        postMessage({
            type: 'finished',
            wasWorking: isWorking // 记录结束时的状态
        });
        switchMode(); // 然后切换模式
    }
}

function switchMode() {
    if (isWorking) {
        pendingPomodoroIncrease = true;

        const nextPomodoroCount = completedPomodoros + 1;
        if (nextPomodoroCount % POMODOROS_PER_CYCLE === 0) {
            isLongBreak = true;
            timeRemaining = LONG_BREAK;
        } else {
            isLongBreak = false;
            timeRemaining = SHORT_BREAK;
        }
        isWorking = false;
    } else {
        if (pendingPomodoroIncrease) {
            completedPomodoros++;
            totalCompletedPomodoros++;
            pendingPomodoroIncrease = false;
        }

        if (isLongBreak) {
            completedCycles++;
            completedPomodoros = 0;
        }

        isLongBreak = false;
        isWorking = true;
        timeRemaining = WORK_TIME;
    }

    postMessage({
        type: 'saveStats',
        completedPomodoros,
        completedCycles,
        totalCompletedPomodoros
    });

    postMessage({
        type: 'update',
        timeRemaining,
        isRunning,
        isWorking,
        isLongBreak,
        completedPomodoros,
        completedCycles,
        totalCompletedPomodoros
    });
}

function setupDailyReset() {
    if (dailyResetTimer) {
        clearTimeout(dailyResetTimer);
    }

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + (now.getHours() >= 5 ? 1 : 0));
    tomorrow.setHours(5, 0, 0, 0);

    const timeUntilReset = tomorrow - now;

    dailyResetTimer = setTimeout(() => {
        clearInterval(timer);
        isRunning = false;
        isWorking = true;
        isLongBreak = false;
        timeRemaining = WORK_TIME;
        completedPomodoros = 0;
        completedCycles = 0;
        totalCompletedPomodoros = 0;
        pendingPomodoroIncrease = false;

        // Save reset timestamp
        self.postMessage({
            type: 'saveResetTimestamp',
            timestamp: new Date().toISOString()
        });

        postMessage({
            type: 'update',
            timeRemaining,
            isRunning,
            isWorking,
            isLongBreak,
            completedPomodoros,
            completedCycles,
            totalCompletedPomodoros
        });

        postMessage({
            type: 'statsReset'
        });

        setupDailyReset();
    }, timeUntilReset);
}