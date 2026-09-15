use super::*;

fn verification_input() -> GameResultInput {
    serde_json::from_value(serde_json::json!({
        "puzzle_hash":"test", "puzzle_string":TEST_PUZZLE, "difficulty":"Easy", "se_rating":1.2,
        "result":"Win", "time_secs":600, "hints_used":0, "mistakes":1,
        "avg_move_time_ms":150, "min_move_time_ms":50, "move_time_std_dev":100.0,
        "player_id":"test-player"
    }))
    .unwrap()
}

#[test]
fn verification_checks_each_difficulty_at_the_time_boundary() {
    for (difficulty, minimum) in [
        ("Beginner", 15),
        ("Easy", 30),
        ("Medium", 60),
        ("Intermediate", 90),
        ("Hard", 120),
        ("Expert", 180),
        ("Master", 300),
        ("Extreme", 600),
        ("unknown", 30),
    ] {
        for (seconds, accepted) in [(minimum - 1, false), (minimum, true), (minimum + 1, true)] {
            let mut input = verification_input();
            input.difficulty = difficulty.into();
            input.time_secs = seconds;
            let result = AntiBot::verify(&input);
            assert_eq!(
                result.verified, accepted,
                "{difficulty} at {seconds}: {:?}",
                result.issues
            );
            if !accepted {
                assert!(result.issues.iter().any(|s| s.contains("below minimum")));
            }
        }
    }
}

#[test]
fn verification_timing_boundaries_and_ios_exemption() {
    for (avg, min, deviation, accepted) in [
        (149, 50, 100.0, false),
        (150, 49, 100.0, false),
        (150, 50, 99.9, false),
        (150, 50, 100.0, true),
        (151, 51, 100.1, true),
    ] {
        let mut input = verification_input();
        input.avg_move_time_ms = Some(avg);
        input.min_move_time_ms = Some(min);
        input.move_time_std_dev = Some(deviation);
        assert_eq!(AntiBot::verify(&input).verified, accepted);
    }
    let mut input = verification_input();
    input.avg_move_time_ms = None;
    input.min_move_time_ms = None;
    input.move_time_std_dev = None;
    assert_eq!(
        AntiBot::verify(&input).issues.len(),
        3,
        "missing platform defaults to web checks"
    );
    input.platform = Some("ios".into());
    assert!(
        AntiBot::verify(&input).verified,
        "iOS does not collect per-move timing"
    );
    input.time_secs = 29;
    assert!(
        !AntiBot::verify(&input).verified,
        "iOS still has minimum solve time"
    );
}

#[test]
fn verification_expert_perfect_game_boundaries() {
    for (difficulty, minimum) in [("Expert", 180), ("Master", 300), ("Extreme", 600)] {
        let mut input = verification_input();
        input.difficulty = difficulty.into();
        input.mistakes = 0;
        input.time_secs = minimum * 2 - 1;
        assert!(!AntiBot::verify(&input).verified);
        input.time_secs = minimum * 2;
        assert!(AntiBot::verify(&input).verified);
        input.time_secs = minimum;
        input.hints_used = 1;
        assert!(AntiBot::verify(&input).verified);
        input.hints_used = 0;
        input.result = "Loss".into();
        assert!(AntiBot::verify(&input).verified);
    }
}

#[test]
fn replay_handles_clear_undo_redo_and_flags_invalid_history() {
    let actions = [
        MoveAction::Place(4),
        MoveAction::Clear(4),
        MoveAction::Undo(Some(4)),
        MoveAction::Clear(4),
        MoveAction::Redo(Some(4)),
        MoveAction::Clear(4),
        MoveAction::Undo(None),
        MoveAction::Redo(None),
        MoveAction::Place(0),
        MoveAction::Hint(10),
    ];
    let log: Vec<_> = actions
        .into_iter()
        .enumerate()
        .map(|(i, action)| MoveLogEntry {
            seq: i as u32,
            ms: 1000 + i as u32 * 200,
            cell: 2,
            action,
        })
        .collect();
    let result = AntiBot::replay(TEST_PUZZLE, &log, 0, 0);
    assert!(result.valid, "{:?}", result.issues);
    assert_eq!((result.server_hints, result.server_mistakes), (0, 0));
    let bad = vec![
        MoveLogEntry {
            seq: 0,
            ms: 1000,
            cell: 0,
            action: MoveAction::Clear(9),
        },
        MoveLogEntry {
            seq: 1,
            ms: 500,
            cell: 81,
            action: MoveAction::Place(1),
        },
    ];
    let result = AntiBot::replay(TEST_PUZZLE, &bad, 0, 0);
    assert!(!result.valid);
    for issue in [
        "clear mismatch",
        "timestamp went backwards",
        "invalid cell index",
    ] {
        assert!(
            result.issues.iter().any(|s| s.contains(issue)),
            "missing {issue}: {:?}",
            result.issues
        );
    }
}

#[test]
fn replay_rejects_unsolvable_puzzle_and_accepts_timing_boundaries() {
    let impossible = format!("123456780000000009{}", "0".repeat(63));
    let result = AntiBot::replay(&impossible, &[], 0, 0);
    assert!(!result.valid);
    assert_eq!(result.issues, ["puzzle has no solution"]);
    let log = vec![
        MoveLogEntry {
            seq: 0,
            ms: 1000,
            cell: 2,
            action: MoveAction::Place(4),
        },
        MoveLogEntry {
            seq: 1,
            ms: 1050,
            cell: 3,
            action: MoveAction::Place(6),
        },
        MoveLogEntry {
            seq: 2,
            ms: 1300,
            cell: 5,
            action: MoveAction::Place(8),
        },
    ];
    let result = AntiBot::replay(&format!("{TEST_PUZZLE}ignored"), &log, 0, 0);
    assert!(result.valid, "{:?}", result.issues);
}

#[test]
fn solver_backtracks_on_hard_puzzle() {
    let puzzle =
        "100007090030020008009600500005300900010080002600004000300000010040000007007000300";
    let digits: Vec<u8> = puzzle.bytes().map(|b| b - b'0').collect();
    let board: [u8; 81] = digits.try_into().unwrap();
    let solution = solve_backtrack(&board).expect("hard puzzle has a solution");
    for (i, digit) in solution.iter().enumerate() {
        if board[i] != 0 {
            assert_eq!(*digit, board[i]);
        }
        let mut blanked = solution;
        blanked[i] = 0;
        assert!((1..=9).contains(digit) && is_valid(&blanked, i, *digit));
    }
}
use crate::models::puzzle::MoveLogEntry;

const TEST_PUZZLE: &str =
    "530070000600195000098000060800060003400803001700020006060000280000419005000080079";

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
    assert!(
        result.valid,
        "clean game should be valid: {:?}",
        result.issues
    );
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
    let wrong_val = if solution[empty_idx] == 9 {
        1
    } else {
        solution[empty_idx] + 1
    };

    let log = vec![MoveLogEntry {
        seq: 0,
        ms: 1000,
        cell: empty_idx as u8,
        action: MoveAction::Place(wrong_val),
    }];

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
        MoveLogEntry {
            seq: 0,
            ms: 1000,
            cell: empty_idx as u8,
            action: MoveAction::Hint(solution[empty_idx]),
        },
        MoveLogEntry {
            seq: 1,
            ms: 2000,
            cell: empty_idx as u8,
            action: MoveAction::Hint(solution[empty_idx]),
        },
    ];

    // Client claims 0 hints, server sees 2
    let result = AntiBot::replay(TEST_PUZZLE, &log, 0, 0);
    assert!(!result.valid, "should flag hint mismatch");
    assert_eq!(result.server_hints, 2);
}

#[test]
fn test_replay_detects_seq_gaps() {
    let log = vec![
        MoveLogEntry {
            seq: 0,
            ms: 1000,
            cell: 0,
            action: MoveAction::Place(1),
        },
        MoveLogEntry {
            seq: 5,
            ms: 2000,
            cell: 1,
            action: MoveAction::Place(2),
        }, // gap
    ];
    let result = AntiBot::replay(TEST_PUZZLE, &log, 2, 0);
    assert!(!result.valid, "should flag seq gap");
    assert!(result.issues.iter().any(|i| i.contains("seq gap")));
}

#[test]
fn test_replay_detects_fast_timing() {
    let log = vec![
        MoveLogEntry {
            seq: 0,
            ms: 1000,
            cell: 0,
            action: MoveAction::Place(1),
        },
        MoveLogEntry {
            seq: 1,
            ms: 1010,
            cell: 1,
            action: MoveAction::Place(2),
        }, // 10ms delta
        MoveLogEntry {
            seq: 2,
            ms: 1020,
            cell: 2,
            action: MoveAction::Place(3),
        }, // 10ms delta
    ];
    let result = AntiBot::replay(TEST_PUZZLE, &log, 3, 0);
    assert!(!result.valid, "should flag fast timing");
    assert!(result.issues.iter().any(|i| i.contains("min move delta")));
}

#[test]
fn test_replay_partial_log_ok() {
    // Partial log (from save/load) — server sees fewer mistakes than client
    let log = vec![MoveLogEntry {
        seq: 0,
        ms: 1000,
        cell: 0,
        action: MoveAction::Place(5),
    }];
    // Client claims 2 mistakes — server may see 0 or 1, but that's OK (only flag if higher)
    let result = AntiBot::replay(TEST_PUZZLE, &log, 2, 0);
    // Should not flag mistake mismatch since server <= client
    assert!(!result
        .issues
        .iter()
        .any(|i| i.contains("mistake count mismatch")));
}
