use super::*;

#[test]
fn test_collect_easy_puzzle() {
    // A well-known easy puzzle solvable with singles only
    let puzzle =
        "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
    let profile = collect_all_techniques(puzzle).expect("should solve");
    assert!(
        profile.max_se_rating <= 3.0,
        "easy puzzle should have low SE rating"
    );
    assert!(!profile.techniques.is_empty());
}

#[test]
fn test_jaccard_identical() {
    let a: HashSet<String> = ["A", "B", "C"].iter().map(|s| s.to_string()).collect();
    let b = a.clone();
    assert!((jaccard_similarity(&a, &b) - 1.0).abs() < f64::EPSILON);
}

#[test]
fn test_jaccard_disjoint() {
    let a: HashSet<String> = ["A", "B"].iter().map(|s| s.to_string()).collect();
    let b: HashSet<String> = ["C", "D"].iter().map(|s| s.to_string()).collect();
    assert!((jaccard_similarity(&a, &b)).abs() < f64::EPSILON);
}

#[test]
fn test_jaccard_empty() {
    let a: HashSet<String> = HashSet::new();
    let b: HashSet<String> = HashSet::new();
    assert!((jaccard_similarity(&a, &b)).abs() < f64::EPSILON);
}

#[test]
fn test_collect_expert_puzzle_with_eliminations() {
    // Expert tier puzzle (SE ~4.6) requiring Unique Rectangle / Empty Rectangle.
    // These techniques produce EliminateCandidates hints — this test guards against
    // the bug where recalculate_candidates() after elimination undoes the progress.
    let puzzle =
        "000704005020010070000080002090006250600070008053200010400090000030060090200301000";
    let profile = collect_all_techniques(puzzle).expect("should solve expert puzzle");
    assert!(
        profile.max_se_rating > 3.0,
        "expert puzzle should have SE > 3.0, got {}",
        profile.max_se_rating
    );
    // Must use more than just singles
    assert!(
        profile.techniques.len() > 2,
        "expert puzzle should use multiple technique types, got: {:?}",
        profile.techniques.keys().collect::<Vec<_>>()
    );
}

#[test]
fn test_technique_seeds_count() {
    let seeds = all_technique_seeds();
    assert_eq!(seeds.len(), 46);
    let arithmetic = seeds
        .iter()
        .find(|seed| seed.name == "ArithmeticCounting")
        .expect("arithmetic findings must resolve to a seeded technique");
    assert_eq!(
        arithmetic.display_name,
        Technique::ArithmeticCounting.to_string()
    );
    assert_eq!(
        arithmetic.se_rating,
        Technique::ArithmeticCounting.se_rating()
    );
    assert_eq!(arithmetic.family, "other");
}

#[test]
fn invalid_puzzle_strings_have_no_profile() {
    for invalid in ["", "not a puzzle", "123456789", &"x".repeat(81)] {
        assert!(collect_all_techniques(invalid).is_none());
    }
}

#[test]
fn a_single_missing_value_counts_exactly_one_placement() {
    let puzzle =
        "034678912672195348198342567859761423426853791713924856961537284287419635345286179";
    let profile = collect_all_techniques(puzzle).expect("one missing value is solvable");
    assert_eq!(
        profile.techniques,
        HashMap::from([("Naked Single".to_owned(), 1)])
    );
    assert_eq!(profile.max_technique, "Naked Single");
    assert_eq!(profile.max_se_rating, Technique::NakedSingle.se_rating());
}

#[test]
fn a_completed_puzzle_has_no_fabricated_technique_uses() {
    let puzzle =
        "534678912672195348198342567859761423426853791713924856961537284287419635345286179";
    let profile = collect_all_techniques(puzzle).expect("completed valid puzzle has a profile");
    assert!(profile.techniques.is_empty());
    assert_eq!(profile.max_technique, "Naked Single");
    assert_eq!(profile.max_se_rating, Technique::NakedSingle.se_rating());
}

#[test]
fn jaccard_counts_partial_overlap_and_is_symmetric() {
    let a = ["A", "B", "C"].map(String::from).into();
    let b = ["B", "C", "D"].map(String::from).into();
    assert_eq!(jaccard_similarity(&a, &b), 0.5);
    assert_eq!(jaccard_similarity(&b, &a), 0.5);
    assert_eq!(jaccard_similarity(&a, &HashSet::new()), 0.0);
    assert_eq!(jaccard_similarity(&HashSet::new(), &b), 0.0);
}

#[test]
fn technique_seed_identifiers_and_ordinals_are_unique() {
    let seeds = all_technique_seeds();
    let mut names = HashSet::new();
    let mut display_names = HashSet::new();
    let mut next_ordinal = HashMap::new();
    for seed in seeds {
        assert!(names.insert(seed.name), "duplicate key: {}", seed.name);
        assert!(display_names.insert(seed.display_name));
        assert!(!seed.display_name.is_empty());
        assert!(seed.se_rating.is_finite() && seed.se_rating >= 1.0);
        let ordinal = next_ordinal.entry(seed.family).or_insert(0);
        assert_eq!(seed.ordinal, *ordinal);
        *ordinal += 1;
    }
    assert_eq!(next_ordinal.len(), 10);
}
