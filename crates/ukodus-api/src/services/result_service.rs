use crate::models::puzzle::{GameResultInput, MoveAction, MoveLogEntry};

pub struct AntiBot;

pub struct VerificationResult {
    pub verified: bool,
    pub issues: Vec<String>,
}

pub struct ReplayResult {
    pub valid: bool,
    pub issues: Vec<String>,
    pub server_mistakes: u32,
    pub server_hints: u32,
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

    /// Replay a move log against the puzzle to validate the game was actually played.
    pub fn replay(puzzle_string: &str, log: &[MoveLogEntry], client_mistakes: u32, client_hints: u32) -> ReplayResult {
        let mut issues = Vec::new();

        // Parse puzzle into [u8; 81]
        let mut puzzle = [0u8; 81];
        for (i, ch) in puzzle_string.chars().enumerate() {
            if i >= 81 { break; }
            puzzle[i] = ch.to_digit(10).unwrap_or(0) as u8;
        }

        // Solve to get the solution
        let solution = match solve_backtrack(&puzzle) {
            Some(s) => s,
            None => {
                issues.push("puzzle has no solution".to_string());
                return ReplayResult { valid: false, issues, server_mistakes: 0, server_hints: 0 };
            }
        };

        // Replay moves
        let mut board = puzzle;
        let mut server_mistakes: u32 = 0;
        let mut server_hints: u32 = 0;
        let mut prev_seq: Option<u32> = None;
        let mut prev_ms: Option<u32> = None;
        let mut move_deltas: Vec<u32> = Vec::new();

        for entry in log {
            // Validate sequence is monotonic
            if let Some(ps) = prev_seq {
                if entry.seq != ps + 1 {
                    issues.push(format!("seq gap: expected {} got {}", ps + 1, entry.seq));
                }
            }
            prev_seq = Some(entry.seq);

            // Validate timestamps are monotonic
            if let Some(pm) = prev_ms {
                if entry.ms < pm {
                    issues.push(format!("timestamp went backwards: {} -> {}", pm, entry.ms));
                } else {
                    move_deltas.push(entry.ms - pm);
                }
            }
            prev_ms = Some(entry.ms);

            // Validate cell index
            if entry.cell >= 81 {
                issues.push(format!("invalid cell index: {}", entry.cell));
                continue;
            }
            let idx = entry.cell as usize;

            match &entry.action {
                MoveAction::Place(v) => {
                    if *v >= 1 && *v <= 9 {
                        board[idx] = *v;
                        if *v != solution[idx] {
                            server_mistakes += 1;
                        }
                    }
                }
                MoveAction::Clear(old_v) => {
                    // Verify old value matches what's on the board
                    if board[idx] != *old_v && board[idx] != 0 {
                        issues.push(format!(
                            "clear mismatch at cell {}: board={} log={}",
                            idx, board[idx], old_v
                        ));
                    }
                    board[idx] = 0;
                }
                MoveAction::Hint(v) => {
                    if *v >= 1 && *v <= 9 {
                        board[idx] = *v;
                        server_hints += 1;
                    }
                }
                MoveAction::Undo(val) | MoveAction::Redo(val) => {
                    board[idx] = val.unwrap_or(0);
                }
            }
        }

        // One-directional mismatch: only flag if server count is HIGHER than client claims.
        // Lower server count is expected from save/load (partial logs).
        if server_mistakes > client_mistakes {
            issues.push(format!(
                "mistake count mismatch: server={} client={}",
                server_mistakes, client_mistakes
            ));
        }
        if server_hints > client_hints {
            issues.push(format!(
                "hint count mismatch: server={} client={}",
                server_hints, client_hints
            ));
        }

        // Timing analysis on move deltas
        if !move_deltas.is_empty() {
            let min_delta = *move_deltas.iter().min().unwrap();
            let avg_delta: u32 = move_deltas.iter().sum::<u32>() / move_deltas.len() as u32;

            if min_delta < 50 {
                issues.push(format!("replay min move delta {}ms < 50ms", min_delta));
            }
            if avg_delta < 150 {
                issues.push(format!("replay avg move delta {}ms < 150ms", avg_delta));
            }
        }

        ReplayResult {
            valid: issues.is_empty(),
            issues,
            server_mistakes,
            server_hints,
        }
    }
}

/// Minimal backtracking solver with MRV heuristic.
/// Returns the unique solution if one exists.
fn solve_backtrack(puzzle: &[u8; 81]) -> Option<[u8; 81]> {
    let mut board = *puzzle;
    if solve_recursive(&mut board) {
        Some(board)
    } else {
        None
    }
}

fn solve_recursive(board: &mut [u8; 81]) -> bool {
    // Find empty cell with fewest candidates (MRV)
    let mut best_idx = None;
    let mut best_count = 10u32;

    for i in 0..81 {
        if board[i] == 0 {
            let count = count_candidates(board, i);
            if count == 0 {
                return false; // dead end
            }
            if count < best_count {
                best_count = count;
                best_idx = Some(i);
                if count == 1 { break; } // can't do better
            }
        }
    }

    let idx = match best_idx {
        Some(i) => i,
        None => return true, // all cells filled — solved
    };

    for digit in 1..=9u8 {
        if is_valid(board, idx, digit) {
            board[idx] = digit;
            if solve_recursive(board) {
                return true;
            }
            board[idx] = 0;
        }
    }

    false
}

fn count_candidates(board: &[u8; 81], idx: usize) -> u32 {
    let mut count = 0;
    for d in 1..=9u8 {
        if is_valid(board, idx, d) {
            count += 1;
        }
    }
    count
}

fn is_valid(board: &[u8; 81], idx: usize, digit: u8) -> bool {
    let row = idx / 9;
    let col = idx % 9;

    // Check row
    for c in 0..9 {
        if board[row * 9 + c] == digit {
            return false;
        }
    }

    // Check column
    for r in 0..9 {
        if board[r * 9 + col] == digit {
            return false;
        }
    }

    // Check 3x3 box
    let box_r = (row / 3) * 3;
    let box_c = (col / 3) * 3;
    for r in box_r..box_r + 3 {
        for c in box_c..box_c + 3 {
            if board[r * 9 + c] == digit {
                return false;
            }
        }
    }

    true
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::puzzle::MoveLogEntry;

    const TEST_PUZZLE: &str = "530070000600195000098000060800060003400803001700020006060000280000419005000080079";

    #[test]
    fn test_solver_finds_solution() {
        let mut puzzle = [0u8; 81];
        for (i, ch) in TEST_PUZZLE.chars().enumerate() {
            puzzle[i] = ch.to_digit(10).unwrap_or(0) as u8;
        }
        let solution = solve_backtrack(&puzzle).expect("should solve");
        // Every cell should be 1-9
        for &v in &solution {
            assert!(v >= 1 && v <= 9, "cell has value {}", v);
        }
        // Givens should be preserved
        for (i, ch) in TEST_PUZZLE.chars().enumerate() {
            let given = ch.to_digit(10).unwrap_or(0) as u8;
            if given != 0 {
                assert_eq!(solution[i], given, "given at {} mismatch", i);
            }
        }
    }

    #[test]
    fn test_replay_clean_game() {
        let mut puzzle = [0u8; 81];
        for (i, ch) in TEST_PUZZLE.chars().enumerate() {
            puzzle[i] = ch.to_digit(10).unwrap_or(0) as u8;
        }
        let solution = solve_backtrack(&puzzle).unwrap();

        // Build a move log that places all empty cells correctly
        let mut log = Vec::new();
        let mut seq = 0u32;
        let mut ms = 1000u32;
        for i in 0..81 {
            if puzzle[i] == 0 {
                log.push(MoveLogEntry {
                    seq,
                    ms,
                    cell: i as u8,
                    action: MoveAction::Place(solution[i]),
                });
                seq += 1;
                ms += 500;
            }
        }

        let result = AntiBot::replay(TEST_PUZZLE, &log, 0, 0);
        assert!(result.valid, "clean game should be valid: {:?}", result.issues);
        assert_eq!(result.server_mistakes, 0);
        assert_eq!(result.server_hints, 0);
    }

    #[test]
    fn test_replay_detects_mistake_mismatch() {
        let mut puzzle = [0u8; 81];
        for (i, ch) in TEST_PUZZLE.chars().enumerate() {
            puzzle[i] = ch.to_digit(10).unwrap_or(0) as u8;
        }
        let solution = solve_backtrack(&puzzle).unwrap();

        // Find first empty cell and place wrong value
        let empty_idx = (0..81).find(|&i| puzzle[i] == 0).unwrap();
        let wrong_val = if solution[empty_idx] == 9 { 1 } else { solution[empty_idx] + 1 };

        let log = vec![
            MoveLogEntry { seq: 0, ms: 1000, cell: empty_idx as u8, action: MoveAction::Place(wrong_val) },
        ];

        // Client claims 0 mistakes, but server sees 1
        let result = AntiBot::replay(TEST_PUZZLE, &log, 0, 0);
        assert!(!result.valid, "should flag mistake mismatch");
        assert_eq!(result.server_mistakes, 1);
    }

    #[test]
    fn test_replay_detects_hint_counting() {
        let mut puzzle = [0u8; 81];
        for (i, ch) in TEST_PUZZLE.chars().enumerate() {
            puzzle[i] = ch.to_digit(10).unwrap_or(0) as u8;
        }
        let solution = solve_backtrack(&puzzle).unwrap();
        let empty_idx = (0..81).find(|&i| puzzle[i] == 0).unwrap();

        let log = vec![
            MoveLogEntry { seq: 0, ms: 1000, cell: empty_idx as u8, action: MoveAction::Hint(solution[empty_idx]) },
            MoveLogEntry { seq: 1, ms: 2000, cell: empty_idx as u8, action: MoveAction::Hint(solution[empty_idx]) },
        ];

        // Client claims 0 hints, server sees 2
        let result = AntiBot::replay(TEST_PUZZLE, &log, 0, 0);
        assert!(!result.valid, "should flag hint mismatch");
        assert_eq!(result.server_hints, 2);
    }

    #[test]
    fn test_replay_detects_seq_gaps() {
        let log = vec![
            MoveLogEntry { seq: 0, ms: 1000, cell: 0, action: MoveAction::Place(1) },
            MoveLogEntry { seq: 5, ms: 2000, cell: 1, action: MoveAction::Place(2) }, // gap
        ];
        let result = AntiBot::replay(TEST_PUZZLE, &log, 2, 0);
        assert!(!result.valid, "should flag seq gap");
        assert!(result.issues.iter().any(|i| i.contains("seq gap")));
    }

    #[test]
    fn test_replay_detects_fast_timing() {
        let log = vec![
            MoveLogEntry { seq: 0, ms: 1000, cell: 0, action: MoveAction::Place(1) },
            MoveLogEntry { seq: 1, ms: 1010, cell: 1, action: MoveAction::Place(2) }, // 10ms delta
            MoveLogEntry { seq: 2, ms: 1020, cell: 2, action: MoveAction::Place(3) }, // 10ms delta
        ];
        let result = AntiBot::replay(TEST_PUZZLE, &log, 3, 0);
        assert!(!result.valid, "should flag fast timing");
        assert!(result.issues.iter().any(|i| i.contains("min move delta")));
    }

    #[test]
    fn test_replay_partial_log_ok() {
        // Partial log (from save/load) — server sees fewer mistakes than client
        let log = vec![
            MoveLogEntry { seq: 0, ms: 1000, cell: 0, action: MoveAction::Place(5) },
        ];
        // Client claims 2 mistakes — server may see 0 or 1, but that's OK (only flag if higher)
        let result = AntiBot::replay(TEST_PUZZLE, &log, 2, 0);
        // Should not flag mistake mismatch since server <= client
        assert!(!result.issues.iter().any(|i| i.contains("mistake count mismatch")));
    }
}
