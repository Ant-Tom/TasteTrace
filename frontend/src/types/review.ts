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
};
