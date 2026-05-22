export type Review = {
  id: number;
  establishmentId: number;
  userId: number;
  authorName: string;
  rating: number;
  text: string;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  ownedByCurrentUser: boolean;
  photoUrls: string[];
  likeCount: number;
  dislikeCount: number;
  currentUserVote: "LIKE" | "DISLIKE" | null;
};

export type ReviewVote = "LIKE" | "DISLIKE";
