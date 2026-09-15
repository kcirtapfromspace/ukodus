# Review and mathematical extension: bounded remainder certificates

15 September 2026. **We derived and checked a stronger certificate for the existing Sudoku research system, with sharp bounds for its six-rule example. Historical originality is unconfirmed.** The useful research direction is to prove what small certificates can express, then use those guarantees to guide the solver.

Artifacts: [standalone Rust verifier and experiments](residue_probe.rs), [reproducible results](results.json). This work adds research files only; it does not integrate a new production technique.

**Subsequent implementation:** the approved follow-up integrated residue checking,
portable replay, offline analyzer commands, and the rebuilt browser engine. See
[the application integration guide](../../arithmetic-integration.md). The version
and architecture descriptions below record the state at the time of this research review.

## 1. Review of the requested survey

Reviewed [novel-methods-survey-2026-09-15.md](../counting-experiment/novel-methods-survey-2026-09-15.md). Its emphasis on small, independently checked deductions is appropriate for this codebase. Several claims need correction before using it as a research prospectus:

| Survey location | Correction and evidence |
| --- | --- |
| Line 10: Bleukx et al. | The paper transforms **Pumpkin DRCP logs**, not VeriPB logs. Its Sudoku benchmark uses 100 expert QQWing puzzles made inconsistent by a mistaken entry. This is explanation of contradictions, rather than a benchmark of solving unmodified expert grids. [Paper, §§3.1, 5 and Appendix B](https://arxiv.org/html/2511.10428v1). |
| Line 20: Douglas–Rachford | The local rate result has convergence and nondegeneracy assumptions. Proposition 4.8 gives an asymptotic error bound of `O((√5/5)^k)` under those assumptions; it does not guarantee arbitrary Sudoku inputs converge. [Tovey–Liang](https://arxiv.org/pdf/2009.04018). |
| Line 21: L1 recovery | The authors numerically classify a 49,151-puzzle collection using uniqueness tolerances. Nonunique minimizers permit wrong outputs; that does not mean every minimizer is wrong. State the observed failures of the tested CVX/YALL1 implementations separately from a theorem. [Wang et al., §III](https://arxiv.org/pdf/1605.01031). |
| Line 19: fractional completion | A rigorous fractional-feasibility theorem does not establish integral Sudoku recovery. Keep those guarantees distinct. [Dukes–Nimegeers](https://arxiv.org/abs/2310.15279). |
| Lines 24–25, 33, 38: absence claims | Replace “no theory exists,” “confirmed gap,” “untried,” and “are unpublished” with “no matching result was located in the bounded searches.” The survey's own limitation paragraph requires this qualification. |
| Lines 31, 39: belief propagation | Specify the factor graph, updates, damping, initialization, and what convergence should mean before posing a theorem. A connection between the existing five-cycle obstruction and BP failure is a conjecture requiring an argument. |

These are a bounded review of the central claims, not verification of every cited paper. The approved implementation follow-up applied these corrections to the survey. Its SHA-256 before those corrections was `60cbcc491ad12d8b6625d4a3a7ca49b098cdee80b32201313558b52d5efc82eb`.

## 2. The extension in plain language

The current arithmetic engine combines rules into one equation and checks whether a candidate would force either an impossible numerical range or a divisibility violation.

Those tests discard information. A sum might fall inside the range and satisfy the gcd test while still being impossible because each candidate can contribute only **zero times or once**.

The proposed extra terminal tracks **which remainders the remaining candidates can actually produce**. For modulus four, there are only four possibilities to track. A missing required remainder proves the candidate false.

This machinery is established mathematics. Modular pseudo-Boolean solving predates this project, and prior work explicitly studies certificates for modular subset-sum nonreachability. See [Ansótegui et al., ECAI 2010](https://doi.org/10.3233/978-1-60750-606-5-867), [Axiotis–Backurs–Tzamos, §3](https://arxiv.org/pdf/1807.04825), and [Pesant–Meel–Mohammadalitajrishi, §3.3](https://www.cs.toronto.edu/~meel/Papers/cpaior21-pmm.pdf). The contribution explored here is the precise Sudoku realization, compression lemma, and sharp certificate bounds.

## 3. A concrete result for the existing six-rule obstruction

### Model and scope

Use the eight Boolean variables and six exactly-one equations already established in the [unrestricted-weight counterexample](/Users/thinkstudio/.codex/worktrees/54ae/ukodus/docs/research/counting-experiment/six-source-unrestricted-incompleteness.md):

```text
E1: a + d     = 1
E2: a + b + f = 1
E3: b + c     = 1
E4: c + e     = 1
E5: d + e     = 1
E6: f + t + u = 1
```

Every variable denotes whether one specific candidate is true. Every equation is one native Sudoku requirement after candidate deletion. The selected model is satisfiable; it forces `t=0`.

All comparisons below use **these same six equations, one weighted combination, and no intermediate deductions**. They do not measure the shortest proof using every rule in a full puzzle, or the power of unrestricted chains. The candidate state is synthetic and satisfiable; ordinary-givens realization and unique-solution status are not claimed.

### One modulus-four certificate

Multiply the first five equations by two and add the sixth:

```text
4(a+b+c+d+e) + 3f + t + u = 11.
```

Assume `t=1`. The remaining sum must be ten. Modulo four, the five cycle variables contribute zero; `3f+u` can contribute only `0, 1, 3` modulo four. Ten has remainder two. Contradiction: **`t=0`**.

For this combination the old interval is `[0,24]` and the gcd is one, so neither old terminal sees a problem.

The earlier obstruction proves something stronger: **no source weights whatsoever** let the old interval/gcd terminals refute `t=1`. Its bounded real countermodel is `(a,b,c,d,e,f,t,u)=(½,½,½,½,½,0,1,0)`; its unrestricted integer countermodel is `(0,0,1,1,0,1,1,−1)`. The former defeats every interval combination; the latter defeats every gcd combination. They are different countermodels, neither Boolean.

### Modulus four is the smallest possible modulus

This statement permits all integer source weights, not just weights up to two.

- **Modulus two:** `(0,0,1,1,0,1,1,1)` is a Boolean assignment satisfying every equation modulo two with `t=1`. It therefore satisfies every weighted congruence.
- **Modulus three:** remove target column `t`. The seven remaining columns have a homogeneous kernel vector `h=(1,1,−1,−1,1,−2,2)`, in order `(a,b,c,d,e,f,u)`. Every combined coefficient vector `γ` satisfies `γ·h=0`. Since every entry of `h` is nonzero modulo three, `γ` cannot have exactly one nonzero coefficient. If it has at least two, their Boolean subset sums already cover all three residues. If all coefficients vanish, the `u` and `f` columns, followed by the cycle columns, force all six source weights to vanish modulo three; the required residue is then zero. Every case leaves a reachable residue.
- **Modulus four:** the displayed certificate succeeds.

The exhaustive checks corroborate the proof: zero refutations among all `2^6=64` and `3^6=729` weight classes; exactly two among `4^6=4,096`, namely cycle weights all two and tail weight one or three. These finite classes exhaust all integer weights for each modulus.

### A coefficient of magnitude two is also necessary

In fact, **every unit-weight combination fails even if the terminal checks exact Boolean attainable sums**, a stronger terminal than checking any one modulus.

Write the cycle weights as `w1,…,w5∈{−1,0,1}` and the tail weight as `v∈{−1,0,1}`. Always fix `t=1`.

1. If `v=0`, use the genuine cycle solution with `f=1,u=0`. Its only violated equation is the zero-weight tail, so the combined equation holds.
2. Otherwise, if some cycle weight `wi=0`, put `f=u=0`. Delete edge `i` of the five-cycle and alternate zero and one along the remaining path. Only the deleted equation fails; its coefficient is zero. The tail holds.
3. Otherwise all cycle weights and `v` are `±1`. Put `f=0,u=1`. The tail's error is `+1`. Deleting any cycle edge gives two complementary alternating assignments; their error on that edge is respectively `−1` or `+1`. Choose the error `δ=−v/wi`. Then `wiδ+v=0`, so the combined equation holds.

Thus each unit-weight equation has a Boolean countermodel under `t=1`, although the simultaneous six-equation system has none. Coefficient magnitude two succeeds, so the bound is sharp. The experiment checks all 729 unit-weight vectors with an independent exact subset-sum enumeration.

### Actual Sudoku coordinates

The Rust fixture uses the equivalent cell-tail version. The six rules are:

```text
g+p0+p4=1     digit 1 in column 4
p0+p1=1      digit 1 in row 4
p1+p2=1      digit 1 in column 2
p2+p3=1      digit 1 in box 1
p3+p4=1      digit 1 in row 2
g+t+u=1      cell r1c4 has candidates {1,2,3}
```

Here `g=r1c4#1`, `p0=r4c4#1`, `p1=r4c2#1`, `p2=r1c2#1`, `p3=r2c1#1`, `p4=r2c4#1`, `t=r1c4#2`, and `u=r1c4#3`. The conclusion is to remove **2 from r1c4**. The same argument removes 3.

The checker reconstructs these rules from all 81 masks and validates a full compatible 9×9 completion. The original construction realizes this six-source model for every square box side `m≥2`; the new arithmetic proof depends only on the model, so transfers to those realizations. This run independently reconstructs and checks the 9×9 case.

Using the workbench's existing [five-source completeness theorem](/Users/thinkstudio/.codex/worktrees/54ae/ukodus/docs/research/counting-experiment/sharp-source-cutoff-note.md), six is also the first native-source count where adding this terminal can improve on the unrestricted interval/gcd grammar. This corollary relies on that previously established theorem; this review did not repeat its entire proof audit.

## 4. A general compression lemma

Suppose an integer combination of native equations gives

```text
2S + g = K,          K odd,
```

where `S` is an integer linear form in Boolean candidates. This is a parity certificate forcing the sole odd-coefficient candidate `g` to one. Suppose a further, distinct native rule is

```text
g + t + z1 + ... + zr = 1.
```

Set `L=r+1`. Multiply the parity combination by `L`, add the further rule, and assume `t=1`:

```text
2L S + (L+1)g + z1 + ... + zr = LK.
```

Modulo `2L`, the required remainder is `L`. If `g=0`, the other displayed variables give sums `0,…,L−1`. If `g=1`, they give `L+1,…,2L`. These omit remainder `L`. Therefore a two-step parity-then-exclusion proof compresses to **one modular certificate**.

An odd guardian coefficient other than one can be absorbed into `2S`; the argument still applies. Treating variables contributing to `S` independently is safe because their entire contribution vanishes modulo `2L`.

For a classic native requirement with at most nine candidates, `r≤7`, hence:

- modulus at most **16**;
- source weights at most **8**, **if the original parity certificate uses unit weights** and the additional requirement is distinct;
- the three-candidate tail gives the sharp six-rule example: weight two, modulus four.

These bounds describe this construction, not all Sudoku deductions. The initial parity certificate may involve more than five sources; its union with the tail must still fit any configured source limit. The prototype tests tails of every size from two through nine on real 9×9 candidate states. For larger tails, minimal modulus among arbitrary combinations remains a separate question; only the upper bound is proved here. Within this specific scaling construction, `L≤r` fails because the spare candidates alone can sum to `L`.

## 5. What would change in the current codebase?

There are three distinct versions to keep straight:

- This Ukodus checkout is at `f83339080fe65bdbca4e81cd4fe1b54e16cd03f2`.
- Its [dependency](/Users/thinkstudio/Documents/ChatGPT/ukodus/Cargo.toml:24) still pins `sudoku-core v0.2.1`, resolving to `ad8f024d507a52eff99fdd8b5173763487b30a31`.
- The sibling [sudoku-core checkout](/Users/thinkstudio/Documents/ChatGPT/sudoku-core/src/solver/arithmetic.rs) is at `d361acd6eaa2984c55be70d2de61861bdca96292` and already implements verified `ArithmeticCounting`. That is the natural integration target, but it is not currently the engine linked by Ukodus.

### Minimal engine change

| Existing location | Proposed change |
| --- | --- |
| [ArithmeticProof and ArithmeticCheck](/Users/thinkstudio/Documents/ChatGPT/sudoku-core/src/solver/arithmetic.rs:81) | Introduce a versioned terminal choice carrying the modulus. Return the recomputed reachable-residue mask as check output. Explicitly preserve v1 semantics for old certificates. |
| [Source reconstruction and checker](/Users/thinkstudio/Documents/ChatGPT/sudoku-core/src/solver/arithmetic.rs:137) | Rebuild coefficients from the exact candidate snapshot, then compute attainable residues. Never trust search-supplied coefficients or a claimed unreachable bit. |
| [Current terminal](/Users/thinkstudio/Documents/ChatGPT/sudoku-core/src/solver/arithmetic.rs:299) | Keep cheap interval/gcd checks first; add bounded residue checking when they fail. The six-rule result fits existing weight-two and six-source limits. |
| [Bounded search](/Users/thinkstudio/Documents/ChatGPT/sudoku-core/src/solver/arithmetic.rs:181) | Initially compile discovered parity certificates with incident native tail rules. This supplies mathematically motivated combinations without blindly enlarging the beam. Retain separate budget and pruning indicators. |
| [Finding and proof plumbing](/Users/thinkstudio/Documents/ChatGPT/sudoku-core/src/solver/explain.rs:184) | Reuse `ArithmeticCounting`; expose the equation, modulus, reachable remainders, and excluded remainder in the explanation. A new terminal does not require a new named human technique. |

For one target and one modulus `q`, standard DP takes `O(sq)` time and `O(q)` state, where `s` is the number of remaining nonzero candidate coefficients:

```text
R = {0}
for each distinct remaining Boolean variable with coefficient a:
    R = R union {(r+a) mod q : r in the PREVIOUS R}
refute the assumed candidate only when required_residue is absent from R
```

Two candidates with the same coefficient still get two updates. Negative coefficients require nonnegative modular reduction. Each update uses the previous set; repeatedly reusing the newly inserted residues would allow one candidate to contribute more than once. At `q≤16`, the set fits in 16 bits. Testing every target separately costs more than checking one target, and exhaustive source selection remains expensive; small state does not establish a fast solver overall.

### Application and replay work

1. **Preserve premises.** Use [search_arithmetic](/Users/thinkstudio/Documents/ChatGPT/sudoku-core/src/solver/mod.rs:87) for mask fixtures. `get_hint`, `solve`, and `count_solutions` rebuild candidates; placement application also rebuilds them. A replay sequence must carry exact pre-step states and explicit state transitions.
2. **Export certificates explicitly.** [Hint.proof is skipped during serialization](/Users/thinkstudio/Documents/ChatGPT/sudoku-core/src/solver/types.rs:350). A puzzle string or explanation text does not contain the candidate premises. Export the full snapshot, proof, engine revision, format version, and options.
3. **Update the linked dependency and catalog together.** The [analyzer seeds and exhaustive technique mappings](/Users/thinkstudio/Documents/ChatGPT/ukodus/crates/ukodus-analyzer/src/lib.rs:58) omit `ArithmeticCounting`. The analyzer currently records technique counts, not replayable proofs. Research records should be stored separately until their meaning is stable.
4. **Verify the browser build path.** The [WASM build script](/Users/thinkstudio/Documents/ChatGPT/ukodus/scripts/build-wasm.sh:13) references an absent upstream directory and emits `frontend/wasm/sudoku.*`; the [live loader](/Users/thinkstudio/Documents/ChatGPT/ukodus/frontend/src/lib/wasm/loader.ts:42) loads static `/wasm/sudoku_wasm.*`. Updating Rust alone does not update browser behavior.
5. **Measure difficulty separately.** The sibling engine's arithmetic score is explicitly uncalibrated. Proof length, human readability, and solve time are different measurements; this result establishes none of those ratings.

A readable explanation for the demonstrated certificate could say: “If r1c4 were 2, the highlighted rules would require remainder 2 after division by 4. The remaining candidates can produce only remainders 0, 1, or 3. Therefore r1c4 cannot be 2.” The familiar two-step Guardian explanation may still be easier for a player; let a proof serve verification without assuming it is the best teaching presentation.

## 6. How to turn this into further mathematics

The productive loop is **define a restricted proof language → find a counterexample → realize it in Sudoku → prove a bound → independently check it → compare prior art**.

Concrete next questions:

1. What is the least modulus needed for the general tail construction when arbitrary source weights are permitted? We proved the exact answer four for one spare candidate, and an upper bound `2(r+1)` generally.
2. Which short parity/interval proof sequences can be compressed with bounded source weights and small moduli? Find obstructions as well as successful templates.
3. Does a capped modular checker add direct deductions on ordinary-givens, uniquely solved puzzle states reached by valid play? Compare fixed states and identical source budgets, then separately compare against the old engine allowed to take several steps.
4. What is the total runtime and proof-size cost of finding these certificates? Measure discovery, checking, and explanation separately; retain unsuccessful runs and exact stop reasons.
5. Can the proof be translated into a supported external format and independently checked there? VeriPB interchange is a separate proof-compilation project; DRCP extraction should not be conflated with it.

There is a useful general ceiling: for `k` exactly-one rows of maximum cardinality `d`, choose base `B>d` with `B≥2`, weights `1,B,…,B^(k−1)`, and modulus `B^k`. Each row sum is a base-B digit without carries. The one congruence is therefore equivalent to all the original equations on Boolean assignments. Unbounded modular certificates are complete for finite selected models, but the modulus grows exponentially. This is established positional-encoding reasoning, not an efficient universal Sudoku algorithm. A cap of sixteen has no general completeness guarantee.

The ambitious claim worth pursuing is a **new theorem about small Sudoku certificates**, with a precise optimality or impossibility bound. Neither changing terminology nor failing to find a paper is enough to establish novelty.

## 7. Reproduction and evidence

From the Ukodus root:

```sh
rustc --edition=2021 --test -O docs/research/modular-certificates/residue_probe.rs -o /tmp/ukodus-residue-tests
/tmp/ukodus-residue-tests
rustc --edition=2021 -O docs/research/modular-certificates/residue_probe.rs -o /tmp/ukodus-residue-probe
/tmp/ukodus-residue-probe > docs/research/modular-certificates/results.json
```

Observed with `rustc 1.95.0 (59807616e 2026-04-14)`:

- **Six tests passed.** The modular DP agrees with independent Boolean enumeration for all coefficient lists of lengths zero through five over `{-2,-1,0,1,2}`, at every modulus 2–16: 58,590 comparisons, plus a modulus-64 edge case.
- All 256 assignments of the eight-variable model were enumerated: one solution, excluding the target.
- Native source incidence was reconstructed from masks and compared with the intended equations; a full compatible 9×9 completion was validated.
- All weight classes at moduli 2, 3, and 4 were checked; all 729 unit-weight vectors were also checked against exact Boolean sums.
- Eight native tail sizes passed, with smaller-scale near-misses rejected. Snapshot changes, incorrect conclusions, duplicate sources, invalid weights, and invalid moduli were rejected.

Two other agents independently checked the central algebra and lower bounds; a separate Python enumeration agreed on the finite counts. This is internal review, not external peer review. The prototype is a classic-Sudoku research verifier with exact mask binding, not a production API, a general discovery search, or a claim of measured solving improvement. Its checks are conditional on the candidate premises; the explicit full completion establishes that the demonstrated premises are satisfiable.
