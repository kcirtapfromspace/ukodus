//! Standalone research verifier; no changes to the production solver.
//! rustc --edition=2021 --test -O residue_probe.rs -o /tmp/residue-tests
//! rustc --edition=2021 -O residue_probe.rs -o /tmp/residue-probe
use std::collections::BTreeSet;

const ALL: u16 = 511;
type Domains = [u16; 81];

#[derive(Clone)]
struct Certificate {
    // Exact snapshot binding in this dependency-free prototype. Production uses SHA-256.
    premises: Domains,
    terms: Vec<(usize, i32)>,
    cell: usize,
    digit: usize,
    value: bool,
    modulus: usize,
}

#[derive(Debug)]
struct Check {
    residual: i32,
    reachable: u64,
    required_residue: usize,
    interval: (i32, i32),
    gcd: i32,
}

fn requirement(domains: &Domains, id: usize) -> Vec<usize> {
    assert!(id < 324);
    if id < 81 {
        return (0..9)
            .filter(|d| domains[id] & (1 << d) != 0)
            .map(|d| id * 9 + d)
            .collect();
    }
    let sector = (id - 81) / 9;
    let digit = (id - 81) % 9;
    (0..81)
        .filter(|&cell| {
            let (r, c) = (cell / 9, cell % 9);
            let member = match sector {
                0..=8 => r == sector,
                9..=17 => c == sector - 9,
                _ => r / 3 * 3 + c / 3 == sector - 18,
            };
            member && domains[cell] & (1 << digit) != 0
        })
        .map(|cell| cell * 9 + digit)
        .collect()
}

// Each coefficient is one distinct Boolean variable. Duplicate coefficients
// must remain duplicated; negative coefficients use Euclidean remainders.
fn residues(coefficients: &[i32], modulus: usize) -> u64 {
    assert!((2..=64).contains(&modulus));
    let mut reachable = 1u64;
    for &coefficient in coefficients {
        let shift = coefficient.rem_euclid(modulus as i32) as usize;
        let previous = reachable;
        for r in 0..modulus {
            if previous & (1u64 << r) != 0 {
                reachable |= 1u64 << ((r + shift) % modulus);
            }
        }
    }
    reachable
}

fn gcd(mut a: i32, mut b: i32) -> i32 {
    while b != 0 {
        (a, b) = (b, a % b);
    }
    a.abs()
}

fn verify(domains: &Domains, proof: &Certificate) -> Result<Check, &'static str> {
    if domains != &proof.premises {
        return Err("candidate snapshot differs");
    }
    if domains.iter().any(|&d| d == 0 || d & !ALL != 0) {
        return Err("invalid domain");
    }
    if (0..324).any(|id| requirement(domains, id).is_empty()) {
        return Err("empty native requirement");
    }
    if proof.cell >= 81
        || !(1..=9).contains(&proof.digit)
        || domains[proof.cell] & (1 << (proof.digit - 1)) == 0
    {
        return Err("invalid target");
    }
    if !(2..=64).contains(&proof.modulus) || proof.terms.is_empty() || proof.terms.len() > 6 {
        return Err("unsupported certificate size");
    }
    let mut seen = [false; 324];
    let mut coefficients = [0i32; 729];
    let mut rhs = 0;
    for &(id, weight) in &proof.terms {
        if id >= 324 || !(-8..=8).contains(&weight) || weight == 0 || seen[id] {
            return Err("invalid source term");
        }
        seen[id] = true;
        rhs += weight;
        // Reconstruct from original domains, never from a search-supplied matrix.
        for var in requirement(domains, id) {
            coefficients[var] += weight;
        }
    }
    let target = proof.cell * 9 + proof.digit - 1;
    let residual = rhs - coefficients[target] * i32::from(!proof.value);
    let remaining: Vec<_> = coefficients
        .iter()
        .enumerate()
        .filter(|&(i, &a)| i != target && a != 0)
        .map(|(_, &a)| a)
        .collect();
    let reachable = residues(&remaining, proof.modulus);
    let required_residue = residual.rem_euclid(proof.modulus as i32) as usize;
    if reachable & (1u64 << required_residue) != 0 {
        return Err("opposite endpoint is not refuted");
    }
    let same_residue = (rhs - coefficients[target] * i32::from(proof.value))
        .rem_euclid(proof.modulus as i32) as usize;
    if reachable & (1u64 << same_residue) == 0 {
        return Err("both endpoints rejected");
    }
    Ok(Check {
        residual,
        reachable,
        required_residue,
        interval: (
            remaining.iter().map(|&a| a.min(0)).sum(),
            remaining.iter().map(|&a| a.max(0)).sum(),
        ),
        gcd: remaining.iter().fold(0, |g, &a| gcd(g, a)),
    })
}

fn fixture(tail_size: usize) -> (Domains, Certificate, [u8; 81]) {
    assert!((2..=9).contains(&tail_size));
    // g, p0,...,p4 from the existing native six-source witness.
    let retained = [3, 30, 28, 1, 9, 12];
    let source_ids = [189, 108, 171, 243, 90];
    let mut domains = [ALL; 81];
    for id in source_ids {
        for var in requirement(&[ALL; 81], id) {
            let cell = var / 9;
            if !retained.contains(&cell) {
                domains[cell] &= !1;
            }
        }
    }
    domains[3] = (1 << tail_size) - 1;
    let scale = tail_size - 1;
    let mut terms: Vec<_> = source_ids
        .into_iter()
        .map(|id| (id, scale as i32))
        .collect();
    terms.push((3, 1));
    let proof = Certificate {
        premises: domains,
        terms,
        cell: 3,
        digit: 2,
        value: false,
        modulus: 2 * scale,
    };
    // A valid full grid using only column symmetries of the canonical grid.
    let completion = std::array::from_fn(|cell| {
        let (row, column) = (cell / 9, cell % 9);
        let stack = column / 3;
        let mut offset = column % 3;
        if stack == 0 && offset != 0 {
            offset = 3 - offset;
        }
        let old_column = ((stack + 2) % 3) * 3 + offset;
        (1 + (3 * (row % 3) + row / 3 + old_column) % 9) as u8
    });
    (domains, proof, completion)
}

fn valid_completion(domains: &Domains, grid: &[u8; 81]) -> bool {
    if grid
        .iter()
        .enumerate()
        .any(|(i, &d)| !(1..=9).contains(&d) || domains[i] & (1 << (d - 1)) == 0)
    {
        return false;
    }
    for sector in 0..27 {
        let mut digits = 0u16;
        for cell in 0..81 {
            let (r, c) = (cell / 9, cell % 9);
            let member = if sector < 9 {
                r == sector
            } else if sector < 18 {
                c == sector - 9
            } else {
                r / 3 * 3 + c / 3 == sector - 18
            };
            if member {
                digits |= 1 << (grid[cell] - 1);
            }
        }
        if digits != ALL {
            return false;
        }
    }
    true
}

// Independently specified abstract witness, variable order a,b,c,d,e,f,t,t'.
const MATRIX: [[i32; 8]; 6] = [
    [1, 0, 0, 1, 0, 0, 0, 0],
    [1, 1, 0, 0, 0, 1, 0, 0],
    [0, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 1, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 1, 1],
];

fn combined(weights: &[i32; 6]) -> (Vec<i32>, i32) {
    let coefficients: Vec<_> = (0..8)
        .map(|j| (0..6).map(|i| weights[i] * MATRIX[i][j]).sum::<i32>())
        .collect();
    let residual = weights.iter().sum::<i32>() - coefficients[6];
    (
        coefficients
            .into_iter()
            .enumerate()
            .filter(|(i, _)| *i != 6)
            .map(|(_, a)| a)
            .collect(),
        residual,
    )
}

fn weights_at(mut number: usize, base: usize, offset: i32) -> [i32; 6] {
    std::array::from_fn(|_| {
        let digit = (number % base) as i32 + offset;
        number /= base;
        digit
    })
}

fn modular_count(modulus: usize) -> usize {
    (0..modulus.pow(6))
        .filter(|&number| {
            let (coefficients, residual) = combined(&weights_at(number, modulus, 0));
            residues(&coefficients, modulus) & (1u64 << residual.rem_euclid(modulus as i32)) == 0
        })
        .count()
}

// Boolean enumeration independent of the modular dynamic program.
fn exact_sums(coefficients: &[i32]) -> BTreeSet<i32> {
    (0..(1usize << coefficients.len()))
        .map(|bits| {
            coefficients
                .iter()
                .enumerate()
                .filter(|(j, _)| bits & (1 << j) != 0)
                .map(|(_, a)| a)
                .sum()
        })
        .collect()
}

fn unit_exact_count() -> usize {
    (0..3usize.pow(6))
        .filter(|&number| {
            let (coefficients, residual) = combined(&weights_at(number, 3, -1));
            !exact_sums(&coefficients).contains(&residual)
        })
        .count()
}

fn main() {
    let (domains, proof, completion) = fixture(3);
    let check = verify(&domains, &proof).unwrap();
    assert!(valid_completion(&domains, &completion));
    let completion: String = completion.iter().map(|&d| char::from(b'0' + d)).collect();
    let mut tail_cases = 0;
    for size in 2..=9 {
        let (state, certificate, grid) = fixture(size);
        assert!(verify(&state, &certificate).is_ok());
        assert!(valid_completion(&state, &grid));
        tail_cases += 1;
    }
    println!("{{");
    println!("  \"schema_version\": 1,");
    println!("  \"scope\": \"fixed native sources; synthetic satisfiable candidate masks\",");
    println!(
        "  \"requirements\": {:?},",
        proof.terms.iter().map(|t| t.0).collect::<Vec<_>>()
    );
    println!(
        "  \"weights\": {:?},",
        proof.terms.iter().map(|t| t.1).collect::<Vec<_>>()
    );
    println!("  \"target\": {{\"cell\": 3, \"digit\": 2, \"value\": false}},");
    println!("  \"masks\": {:?},", domains);
    println!("  \"completion\": \"{}\",", completion);
    println!(
        "  \"modulus\": {}, \"required_residue\": {}, \"reachable_bitmask\": {},",
        proof.modulus, check.required_residue, check.reachable
    );
    println!(
        "  \"residual\": {}, \"interval\": [{}, {}], \"gcd\": {},",
        check.residual, check.interval.0, check.interval.1, check.gcd
    );
    println!("  \"all_weight_residue_classes\": [");
    for modulus in 2usize..=4 {
        println!(
            "    {{\"modulus\": {}, \"classes\": {}, \"refutations\": {}}}{}",
            modulus,
            modulus.pow(6),
            modular_count(modulus),
            if modulus == 4 { "" } else { "," }
        );
    }
    println!("  ],");
    println!(
        "  \"unit_weight_exact_sum_classes\": 729, \"unit_weight_exact_sum_refutations\": {},",
        unit_exact_count()
    );
    println!("  \"native_tail_sizes_verified\": {}", tail_cases);
    println!("}}");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn modular_dp_matches_independent_boolean_enumeration() {
        for length in 0..=5u32 {
            for mut encoding in 0..5usize.pow(length) {
                let coefficients: Vec<_> = (0..length)
                    .map(|_| {
                        let a = (encoding % 5) as i32 - 2;
                        encoding /= 5;
                        a
                    })
                    .collect();
                let exact = exact_sums(&coefficients);
                for modulus in 2usize..=16 {
                    let expected = exact.iter().fold(0u64, |bits, &sum| {
                        bits | (1u64 << sum.rem_euclid(modulus as i32))
                    });
                    assert_eq!(residues(&coefficients, modulus), expected);
                }
            }
        }
        assert_eq!(residues(&[63, -1, 1], 64), (1u64 << 63) | (1u64 << 62) | 3);
    }

    #[test]
    fn native_sources_and_completion_match_the_proved_model() {
        let (domains, proof, completion) = fixture(3);
        // Candidate order g,p0,p1,p2,p3,p4,t,t'.
        let variables = [27, 270, 252, 9, 81, 108, 28, 29];
        let expected = [
            vec![0, 1, 5],
            vec![1, 2],
            vec![2, 3],
            vec![3, 4],
            vec![4, 5],
            vec![0, 6, 7],
        ];
        for ((id, _), row) in proof.terms.iter().zip(expected) {
            let actual: BTreeSet<_> = requirement(&domains, *id).into_iter().collect();
            let expected: BTreeSet<_> = row.into_iter().map(|i| variables[i]).collect();
            assert_eq!(actual, expected);
        }
        assert!(valid_completion(&domains, &completion));
        let check = verify(&domains, &proof).unwrap();
        assert_eq!(
            (check.residual, check.required_residue, check.reachable),
            (10, 2, 11)
        );
        assert_eq!(check.interval, (0, 24));
        assert_eq!(check.gcd, 1);
    }

    #[test]
    fn only_one_boolean_assignment_and_no_opposite() {
        let solutions: Vec<_> = (0..256)
            .filter(|&bits| {
                MATRIX.iter().all(|row| {
                    row.iter()
                        .enumerate()
                        .map(|(j, &a)| a * i32::from(bits & (1 << j) != 0))
                        .sum::<i32>()
                        == 1
                })
            })
            .collect();
        assert_eq!(solutions, vec![44]); // c=d=f=1; everything else zero.
    }

    #[test]
    fn sharp_modulus_and_unit_weight_limits() {
        assert_eq!(modular_count(2), 0);
        assert_eq!(modular_count(3), 0);
        assert_eq!(modular_count(4), 2);
        assert_eq!(unit_exact_count(), 0);
    }

    #[test]
    fn general_tail_compression_and_near_misses() {
        for size in 2..=9 {
            let (domains, proof, completion) = fixture(size);
            assert!(verify(&domains, &proof).is_ok());
            assert!(valid_completion(&domains, &completion));
            for scale in 1..size - 1 {
                let mut near_miss = proof.clone();
                for term in &mut near_miss.terms[..5] {
                    term.1 = scale as i32;
                }
                near_miss.modulus = 2 * scale;
                assert!(verify(&domains, &near_miss).is_err());
            }
        }
    }

    #[test]
    fn rejects_tampering_and_wrong_conclusions() {
        let (domains, proof, _) = fixture(3);
        let mut changed = domains;
        changed[80] &= !256;
        assert!(verify(&changed, &proof).is_err());
        let mut wrong = proof.clone();
        wrong.value = true;
        assert!(verify(&domains, &wrong).is_err());
        wrong = proof.clone();
        wrong.modulus = 3;
        assert!(verify(&domains, &wrong).is_err());
        wrong = proof.clone();
        wrong.terms[1].0 = wrong.terms[0].0;
        assert!(verify(&domains, &wrong).is_err());
        wrong = proof.clone();
        wrong.terms[0].1 = i32::MIN;
        assert!(verify(&domains, &wrong).is_err());
        wrong = proof.clone();
        wrong.modulus = 65;
        assert!(verify(&domains, &wrong).is_err());
    }
}
