export interface ResultPayload {
	player_id: string;
	player_tag: string | null;
	puzzle_hash: string;
	puzzle_string: string;
	short_code: string | null;
	difficulty: string;
	se_rating: number;
	result: 'Win' | 'Loss';
	time_secs: number;
	mistakes: number;
	hints_used: number;
	moves_count: number;
	avg_move_time_ms: number;
	min_move_time_ms: number;
	move_time_std_dev: number;
	move_log: unknown[] | null;
}

export interface SharePayload {
	short_code: string;
	puzzle_string: string;
	difficulty: string;
	se_rating: number;
	platform: string;
	player_id: string;
}

export interface LeaderboardEntry {
	player_id: string;
	player_tag: string | null;
	time_secs: number;
	hints_used: number;
	mistakes: number;
}

export interface GalaxyNode {
	id: string;
	puzzle_hash: string;
	short_code?: string;
	puzzle_string?: string;
	difficulty: string;
	se_rating: number;
	play_count: number;
	max_technique?: string | null;
	techniques: string[];
	avg_time_secs?: number;
	x?: number;
	y?: number;
	fx?: number | null;
	fy?: number | null;
}

export interface GalaxyEdge {
	source: string | GalaxyNode;
	target: string | GalaxyNode;
	similarity: number;
}

export interface GalaxyOverview {
	nodes: GalaxyNode[];
	edges: GalaxyEdge[];
}

export interface GalaxyStats {
	total_puzzles: number;
	total_plays: number;
}

export interface PuzzleDetail {
	puzzle_hash: string;
	puzzle_string: string;
	short_code: string | null;
	difficulty: string;
	se_rating: number;
	play_count: number;
	avg_solve_time: number;
	win_rate: number;
	techniques: string[];
}

export interface MinedPuzzleInput {
	puzzle_hash: string;
	puzzle_string: string;
	solution_string: string;
	difficulty: string;
	se_rating: number;
	short_code?: string;
}

export interface MinedPuzzleResponse {
	accepted: boolean;
	duplicate: boolean;
}
