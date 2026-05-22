// utils/types.ts.ts

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

export type IconProps = {
    size?: number;
    className?: string;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    points: number;
    type: string;
    category: string;
    image: string;
    callToAction: string;
    taskData: any;
    taskStartTimestamp: Date | null;
    isCompleted: boolean;
}

export interface TaskPopupProps {
    task: Task;
    onClose: () => void;
    onUpdate: (updatedTask: Task) => void;
}

export interface LeaguesData {
  weekKey: string;
  nextChampionshipWeek: string;
  currentTier: string;
  weeklyPoints: number;
  totalPoints: number;
  weeklyTeamPoints?: number;
  totalTeamPoints?: number;
  rankInTier: number | null;
  tierLeaderboard: Array<{ rank: number; name: string; leaguePoints: number }>;
  customLeagues: Array<{
    id: string;
    name: string;
    inviteCode: string;
    inviteLink: string | null;
    isCreator: boolean;
    memberCount: number;
    myRank?: number;
    myPoints?: number;
  }>;
  championship: { nextWeek: string; topQualify: number; qualified: boolean };
}