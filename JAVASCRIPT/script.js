document.addEventListener('DOMContentLoaded', () => {

    /**
     * 1. STATE (Store Data)
     */
    const state = {
        sessionStartTime: Date.now(),
        hasDecided: false,
        hoverData: {},          // stores hover times in ms per option
        totalHoverTime: 0,
        currentHoverOption: null,
        hoverInterval: null,
        trackedOptions: []      // tracks available options
    };

    /**
     * 2. UI UPDATES (Presentation)
     */
    const ui = {
        elements: {
            status: document.getElementById('live-status'),
            welcomeBanner: document.getElementById('welcome-banner'),
            metrics: {
                selection: document.getElementById('metric-selection'),
                decisionTime: document.getElementById('metric-decision-time'),
                hoverTime: document.getElementById('metric-hover-time'),
                behaviorType: document.getElementById('metric-behavior-type'),
                confidence: document.getElementById('metric-confidence')
            },
            suggestion: document.getElementById('smart-suggestion')
        },

        showWelcomeBanner(message) {
            this.elements.welcomeBanner.innerText = message;
            this.elements.welcomeBanner.classList.remove('hidden');
        },

        updateStatus(statusText) {
            if (state.hasDecided && statusText !== "Analysis Complete ✅") return;
            this.elements.status.innerText = statusText;
        },

        updateProgressBar(optionLabel) {
            const progressFill = document.getElementById(`progress-${optionLabel}`);
            if (!progressFill) return;
            // Map 2000ms hover time to 100% fullness 
            const percent = Math.min(100, (state.hoverData[optionLabel] / 2000) * 100);
            progressFill.style.width = `${percent}%`;
        },

        highlightSelectedOption(selectedElement) {
            document.querySelectorAll('.option').forEach(opt => {
                opt.classList.add('locked');
            });
            selectedElement.classList.remove('locked');
            selectedElement.classList.add('selected');
        },

        renderDashboard(results) {
            this.elements.metrics.selection.innerText = results.selection;
            this.elements.metrics.decisionTime.innerText = `${results.decisionTime.toFixed(2)}s`;
            this.elements.metrics.hoverTime.innerText = `${results.selectionHoverTime.toFixed(2)}s`;
            this.elements.metrics.behaviorType.innerText = results.behaviorType;
            this.elements.metrics.confidence.innerText = `${results.confidence}%`;
            this.elements.suggestion.innerText = results.suggestion;
        }
    };

    /**
     * 3. ANALYSIS LOGIC (Processing)
     */
    const analysis = {
        getMemory() {
            return {
                lastBehavior: localStorage.getItem('lastBehavior'),
                lastSelected: localStorage.getItem('lastSelected')
            };
        },

        saveMemory(behavior, selection) {
            localStorage.setItem('lastBehavior', behavior);
            localStorage.setItem('lastSelected', selection);
        },

        calculateDecisionTime() {
            // Mitigate negatives safely
            const timeDiff = Math.max(0, Date.now() - state.sessionStartTime);
            return timeDiff / 1000;
        },

        determineBehaviorProfile(decisionTimeSeconds) {
            if (decisionTimeSeconds < 2) return "Action-Oriented ⚡";
            if (decisionTimeSeconds <= 5) return "Balanced Evaluator ⚖️";
            return "Analytical Thinker 🌊";
        },

        generateSuggestion(decisionTimeSeconds) {
            if (decisionTimeSeconds < 2) return "Rapid decision making noted. Continue trusting your immediate intuition.";
            if (decisionTimeSeconds <= 5) return "Healthy evaluation time detected. You balance speed with consideration.";
            return "Deep analysis detected. Your methodical approach ensures thorough evaluation.";
        },

        calculateConfidence(optionLabel) {
            const optionHoverTime = state.hoverData[optionLabel] || 0;
            
            // Fast click fallback
            if (state.totalHoverTime === 0 || optionHoverTime === 0) {
                return 50; 
            }
            
            // Map percentage of relative focus
            const ratio = optionHoverTime / state.totalHoverTime;
            return Math.min(99, Math.round(50 + (ratio * 49)));
        },

        processResults(selectionLabel) {
            const decisionTime = this.calculateDecisionTime();
            const behaviorProfile = this.determineBehaviorProfile(decisionTime);
            
            const results = {
                selection: selectionLabel,
                decisionTime: decisionTime,
                selectionHoverTime: (state.hoverData[selectionLabel] || 0) / 1000,
                behaviorType: behaviorProfile,
                confidence: this.calculateConfidence(selectionLabel),
                suggestion: this.generateSuggestion(decisionTime)
            };

            this.saveMemory(results.behaviorType, results.selection);
            return results;
        }
    };

    /**
     * 4. EVENT TRACKING (Triggers)
     */
    const tracking = {
        init() {
            // Restore persistent state immediately
            const memory = analysis.getMemory();
            if (memory.lastBehavior && memory.lastSelected) {
                ui.showWelcomeBanner(`System Memory: Previous selection was ${memory.lastSelected} (${memory.lastBehavior})`);
            }

            const optionContainers = document.querySelectorAll('.option-container');
            optionContainers.forEach(container => {
                const optionElement = container.querySelector('.option');
                const optionLabel = container.getAttribute('data-option');
                
                state.hoverData[optionLabel] = 0;
                state.trackedOptions.push(optionLabel);

                this.bindEvents(container, optionElement, optionLabel);
            });
        },

        bindEvents(container, optionElement, optionLabel) {
            
            container.addEventListener('mouseenter', () => {
                if (state.hasDecided) return;
                state.currentHoverOption = optionLabel;
                ui.updateStatus("Tracking user focus...");
                
                state.hoverInterval = setInterval(() => {
                    if (state.hasDecided) {
                        clearInterval(state.hoverInterval);
                        return;
                    }
                    state.hoverData[optionLabel] += 50;
                    state.totalHoverTime += 50;
                    ui.updateProgressBar(optionLabel);
                }, 50); // 50ms pulse
            });

            container.addEventListener('mouseleave', () => {
                if (state.hasDecided) return;
                if (state.currentHoverOption === optionLabel) {
                    clearInterval(state.hoverInterval);
                    state.currentHoverOption = null;
                    ui.updateStatus("Monitoring interaction...");
                }
            });

            optionElement.addEventListener('click', (e) => {
                e.preventDefault();
                if (state.hasDecided) return;

                // Stop tracking immediately
                state.hasDecided = true;
                clearInterval(state.hoverInterval);
                
                // Orchestrate Data Flow to UI Update
                ui.updateStatus("Analysis Complete ✅");
                ui.highlightSelectedOption(optionElement);

                const finalResults = analysis.processResults(optionLabel);
                ui.renderDashboard(finalResults);
            });
        }
    };

    // System Boot
    tracking.init();
});
