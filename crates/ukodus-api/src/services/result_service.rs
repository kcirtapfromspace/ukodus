use crate::models::puzzle::GameResultInput;

pub struct AntiBot;

pub struct VerificationResult {
    pub verified: bool,
    pub issues: Vec<String>,
}

impl AntiBot {
    pub fn verify(input: &GameResultInput) -> VerificationResult {
        let mut issues = Vec::new();
        let platform = input.platform.as_deref().unwrap_or("web");

        // Min time by difficulty (all platforms)
        let min_time = match input.difficulty.as_str() {
            "Beginner" => 15,
            "Easy" => 30,
            "Medium" => 60,
            "Intermediate" => 90,
            "Hard" => 120,
            "Expert" => 180,
            "Master" => 300,
            "Extreme" => 600,
            _ => 30,
        };

        if input.time_secs < min_time {
            issues.push(format!(
                "solve time {}s below minimum {}s for {}",
                input.time_secs, min_time, input.difficulty
            ));
        }

        // Timing checks only for web (iOS doesn't track per-move timing)
        if platform == "web" {
            let avg_mt = input.avg_move_time_ms.unwrap_or(0);
            let min_mt = input.min_move_time_ms.unwrap_or(0);
            let std_dev = input.move_time_std_dev.unwrap_or(0.0);

            // Min avg move time: 150ms
            if avg_mt < 150 {
                issues.push(format!(
                    "avg move time {}ms below minimum 150ms",
                    avg_mt
                ));
            }

            // Min single move time: 50ms
            if min_mt < 50 {
                issues.push(format!(
                    "min move time {}ms below minimum 50ms",
                    min_mt
                ));
            }

            // Min std dev: 100.0
            if std_dev < 100.0 {
                issues.push(format!(
                    "move time std dev {:.1} below minimum 100.0",
                    std_dev
                ));
            }
        }

        // Expert perfect game check: suspicious if expert+ with 0 mistakes, 0 hints (all platforms)
        let is_expert_tier = matches!(
            input.difficulty.as_str(),
            "Expert" | "Master" | "Extreme"
        );
        if is_expert_tier
            && input.result == "Win"
            && input.mistakes == 0
            && input.hints_used == 0
            && input.time_secs < min_time * 2
        {
            issues.push(format!(
                "perfect {} game in {}s is suspicious",
                input.difficulty, input.time_secs
            ));
        }

        VerificationResult {
            verified: issues.is_empty(),
            issues,
        }
    }
}
