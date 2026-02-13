use std::collections::{HashMap, HashSet};

use sudoku_core::{Grid, HintType, Solver, Technique};

/// Profile of techniques required to solve a puzzle.
pub struct TechniqueProfile {
    /// technique display_name -> count of times used
    pub techniques: HashMap<String, u32>,
    /// Display name of the hardest technique used
    pub max_technique: String,
    /// SE rating of the hardest technique
    pub max_se_rating: f32,
}

/// Solve a puzzle step-by-step using the hint system, collecting every technique used.
///
/// Returns `None` if the puzzle string is invalid or the solver gets stuck
/// (which shouldn't happen for valid puzzles with unique solutions).
pub fn collect_all_techniques(puzzle_string: &str) -> Option<TechniqueProfile> {
    let mut grid = Grid::from_string(puzzle_string)?;
    grid.recalculate_candidates();

    let solver = Solver;
    let mut techniques: HashMap<String, u32> = HashMap::new();
    let mut max_technique: Technique = Technique::NakedSingle;

    let mut iterations = 0;
    const MAX_ITERATIONS: usize = 10_000;

    while !grid.is_solved() {
        iterations += 1;
        if iterations > MAX_ITERATIONS {
            // Safety valve: avoid infinite loops on malformed puzzles
            return None;
        }

        let hint = solver.get_hint(&grid)?;
        let tech = hint.technique;

        *techniques.entry(tech.to_string()).or_insert(0) += 1;

        if tech > max_technique {
            max_technique = tech;
        }

        // Apply the hint to the grid
        match hint.hint_type {
            HintType::SetValue { pos, value } => {
                grid.set_cell_unchecked(pos, Some(value));
            }
            HintType::EliminateCandidates { pos, values } => {
                for v in values {
                    grid.cell_mut(pos).remove_candidate(v);
                }
            }
        }

        // Recalculate candidates after placing a value so the solver sees the updated state
        grid.recalculate_candidates();
    }

    Some(TechniqueProfile {
        techniques,
        max_technique: max_technique.to_string(),
        max_se_rating: max_technique.se_rating(),
    })
}

/// Compute Jaccard similarity between two sets of technique names.
///
/// J(A, B) = |A intersect B| / |A union B|
/// Returns 0.0 if both sets are empty.
pub fn jaccard_similarity(a: &HashSet<String>, b: &HashSet<String>) -> f64 {
    let intersection = a.intersection(b).count();
    let union = a.union(b).count();
    if union == 0 {
        return 0.0;
    }
    intersection as f64 / union as f64
}

/// All 45 techniques with their family and ordinal (position within family).
pub struct TechniqueSeed {
    pub name: &'static str,
    pub display_name: &'static str,
    pub se_rating: f32,
    pub family: &'static str,
    pub ordinal: u32,
}

/// Returns the full list of technique seed data for Neo4j ingestion.
pub fn all_technique_seeds() -> Vec<TechniqueSeed> {
    use Technique::*;
    let families: &[(&str, &[Technique])] = &[
        (
            "singles",
            &[NakedSingle, HiddenSingle],
        ),
        (
            "pairs_triples",
            &[NakedPair, HiddenPair, NakedTriple, HiddenTriple, NakedQuad, HiddenQuad],
        ),
        (
            "intersections",
            &[PointingPair, BoxLineReduction],
        ),
        (
            "fish",
            &[
                XWing, FinnedXWing, Swordfish, FinnedSwordfish, Jellyfish,
                FinnedJellyfish, FrankenFish, SiameseFish, MutantFish, KrakenFish,
            ],
        ),
        (
            "wings",
            &[XYWing, XYZWing, WXYZWing, WWing],
        ),
        (
            "chains",
            &[XChain, ThreeDMedusa, AIC],
        ),
        (
            "rectangles",
            &[
                EmptyRectangle, AvoidableRectangle, UniqueRectangle,
                HiddenRectangle, ExtendedUniqueRectangle,
            ],
        ),
        (
            "als",
            &[AlsXz, AlsXyWing, AlsChain],
        ),
        (
            "forcing",
            &[NishioForcingChain, CellForcingChain, RegionForcingChain, DynamicForcingChain],
        ),
        (
            "other",
            &[
                SueDeCoq, BivalueUniversalGrave, AlignedPairExclusion,
                AlignedTripletExclusion, DeathBlossom, Backtracking,
            ],
        ),
    ];

    let mut seeds = Vec::with_capacity(45);
    for (family, techniques) in families {
        for (ordinal, tech) in techniques.iter().enumerate() {
            seeds.push(TechniqueSeed {
                name: technique_enum_name(*tech),
                display_name: technique_display_name(*tech),
                se_rating: tech.se_rating(),
                family,
                ordinal: ordinal as u32,
            });
        }
    }
    seeds
}

/// Stable enum variant name (PascalCase) for storage as a unique key.
fn technique_enum_name(t: Technique) -> &'static str {
    match t {
        Technique::NakedSingle => "NakedSingle",
        Technique::HiddenSingle => "HiddenSingle",
        Technique::NakedPair => "NakedPair",
        Technique::HiddenPair => "HiddenPair",
        Technique::NakedTriple => "NakedTriple",
        Technique::HiddenTriple => "HiddenTriple",
        Technique::PointingPair => "PointingPair",
        Technique::BoxLineReduction => "BoxLineReduction",
        Technique::XWing => "XWing",
        Technique::FinnedXWing => "FinnedXWing",
        Technique::Swordfish => "Swordfish",
        Technique::FinnedSwordfish => "FinnedSwordfish",
        Technique::Jellyfish => "Jellyfish",
        Technique::FinnedJellyfish => "FinnedJellyfish",
        Technique::NakedQuad => "NakedQuad",
        Technique::HiddenQuad => "HiddenQuad",
        Technique::EmptyRectangle => "EmptyRectangle",
        Technique::AvoidableRectangle => "AvoidableRectangle",
        Technique::UniqueRectangle => "UniqueRectangle",
        Technique::HiddenRectangle => "HiddenRectangle",
        Technique::XYWing => "XYWing",
        Technique::XYZWing => "XYZWing",
        Technique::WXYZWing => "WXYZWing",
        Technique::WWing => "WWing",
        Technique::XChain => "XChain",
        Technique::ThreeDMedusa => "ThreeDMedusa",
        Technique::SueDeCoq => "SueDeCoq",
        Technique::AIC => "AIC",
        Technique::FrankenFish => "FrankenFish",
        Technique::SiameseFish => "SiameseFish",
        Technique::AlsXz => "AlsXz",
        Technique::ExtendedUniqueRectangle => "ExtendedUniqueRectangle",
        Technique::BivalueUniversalGrave => "BivalueUniversalGrave",
        Technique::AlsXyWing => "AlsXyWing",
        Technique::AlsChain => "AlsChain",
        Technique::MutantFish => "MutantFish",
        Technique::AlignedPairExclusion => "AlignedPairExclusion",
        Technique::AlignedTripletExclusion => "AlignedTripletExclusion",
        Technique::DeathBlossom => "DeathBlossom",
        Technique::NishioForcingChain => "NishioForcingChain",
        Technique::KrakenFish => "KrakenFish",
        Technique::RegionForcingChain => "RegionForcingChain",
        Technique::CellForcingChain => "CellForcingChain",
        Technique::DynamicForcingChain => "DynamicForcingChain",
        Technique::Backtracking => "Backtracking",
    }
}

/// Human-readable display name matching the Technique::Display impl.
fn technique_display_name(t: Technique) -> &'static str {
    match t {
        Technique::NakedSingle => "Naked Single",
        Technique::HiddenSingle => "Hidden Single",
        Technique::NakedPair => "Naked Pair",
        Technique::HiddenPair => "Hidden Pair",
        Technique::NakedTriple => "Naked Triple",
        Technique::HiddenTriple => "Hidden Triple",
        Technique::PointingPair => "Pointing Pair",
        Technique::BoxLineReduction => "Box/Line Reduction",
        Technique::XWing => "X-Wing",
        Technique::FinnedXWing => "Finned X-Wing",
        Technique::Swordfish => "Swordfish",
        Technique::FinnedSwordfish => "Finned Swordfish",
        Technique::Jellyfish => "Jellyfish",
        Technique::FinnedJellyfish => "Finned Jellyfish",
        Technique::NakedQuad => "Naked Quad",
        Technique::HiddenQuad => "Hidden Quad",
        Technique::EmptyRectangle => "Empty Rectangle",
        Technique::AvoidableRectangle => "Avoidable Rectangle",
        Technique::UniqueRectangle => "Unique Rectangle",
        Technique::HiddenRectangle => "Hidden Rectangle",
        Technique::XYWing => "XY-Wing",
        Technique::XYZWing => "XYZ-Wing",
        Technique::WXYZWing => "WXYZ-Wing",
        Technique::WWing => "W-Wing",
        Technique::XChain => "X-Chain",
        Technique::ThreeDMedusa => "3D Medusa",
        Technique::SueDeCoq => "Sue de Coq",
        Technique::AIC => "AIC",
        Technique::FrankenFish => "Franken Fish",
        Technique::SiameseFish => "Siamese Fish",
        Technique::AlsXz => "ALS-XZ",
        Technique::ExtendedUniqueRectangle => "Extended Unique Rectangle",
        Technique::BivalueUniversalGrave => "BUG+1",
        Technique::AlsXyWing => "ALS-XY-Wing",
        Technique::AlsChain => "ALS Chain",
        Technique::MutantFish => "Mutant Fish",
        Technique::AlignedPairExclusion => "Aligned Pair Exclusion",
        Technique::AlignedTripletExclusion => "Aligned Triplet Exclusion",
        Technique::DeathBlossom => "Death Blossom",
        Technique::NishioForcingChain => "Nishio Forcing Chain",
        Technique::KrakenFish => "Kraken Fish",
        Technique::RegionForcingChain => "Region Forcing Chain",
        Technique::CellForcingChain => "Cell Forcing Chain",
        Technique::DynamicForcingChain => "Dynamic Forcing Chain",
        Technique::Backtracking => "Backtracking",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_collect_easy_puzzle() {
        // A well-known easy puzzle solvable with singles only
        let puzzle = "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
        let profile = collect_all_techniques(puzzle).expect("should solve");
        assert!(profile.max_se_rating <= 3.0, "easy puzzle should have low SE rating");
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
    fn test_technique_seeds_count() {
        let seeds = all_technique_seeds();
        assert_eq!(seeds.len(), 45);
    }
}
