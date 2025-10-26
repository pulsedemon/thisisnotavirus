import { describe, it, expect } from "vitest";
import { Prize, ImagesResponse } from "../types";

describe("Types", () => {
  describe("Prize interface", () => {
    it("should allow creating a valid prize object", () => {
      const mockMesh = {
        position: { x: 0, y: 0, z: 0 },
        material: {},
        id: "test-prize",
      } as any;

      const mockRigidBody = {} as any;

      const prize: Prize = {
        mesh: mockMesh,
        rigidBody: mockRigidBody,
        grabbed: false,
        settled: false,
        imageUrl: "test.jpg",
        weight: 1.0,
        deformability: 0.5,
        bounciness: 0.2,
        materialType: "ball",
        gripStrength: 0,
        dropChance: 0,
      };

      expect(prize.grabbed).toBe(false);
      expect(prize.settled).toBe(false);
      expect(prize.imageUrl).toBe("test.jpg");
      expect(prize.weight).toBe(1.0);
      expect(prize.materialType).toBe("ball");
    });

    it("should support all material types", () => {
      const materialTypes = ["plush", "ball", "box", "cylinder"] as const;

      materialTypes.forEach((type) => {
        const prize: Prize = {
          mesh: {} as any,
          rigidBody: {} as any,
          grabbed: false,
          settled: false,
          imageUrl: "test.jpg",
          weight: 1,
          deformability: 0.5,
          bounciness: 0.2,
          materialType: type,
          gripStrength: 0,
          dropChance: 0,
        };
        expect(prize.materialType).toBe(type);
      });
    });
  });

  describe("ImagesResponse interface", () => {
    it("should support images array", () => {
      const response: ImagesResponse = {
        images: ["image1.jpg", "image2.png", "image3.webp"],
      };

      expect(response.images).toHaveLength(3);
      expect(response.images[0]).toBe("image1.jpg");
      expect(Array.isArray(response.images)).toBe(true);
    });

    it("should handle empty images array", () => {
      const response: ImagesResponse = {
        images: [],
      };

      expect(response.images).toHaveLength(0);
    });
  });
});
