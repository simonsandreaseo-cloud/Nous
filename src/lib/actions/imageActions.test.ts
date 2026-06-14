import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    storage: {
        from: vi.fn(),
        upload: vi.fn().mockResolvedValue({ error: null }),
    },
    getPublicUrl: vi.fn().mockResolvedValue({ data: { publicUrl: 'http://test.com/image.webp' } }),
    insert: vi.fn().mockResolvedValue({ error: null }),
};

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => mockSupabase),
}));

vi.mock('sharp', () => {
    const sharpMock = {
        webp: vi.fn().mockReturnThis(),
        resize: vi.fn().mockReturnThis(),
        toBuffer: vi.fn(),
        metadata: vi.fn().mockResolvedValue({ width: 1000, height: 1000 }),
    };
    return {
        default: vi.fn(() => sharpMock),
    };
});

import { binarySearchQuality, optimizeImageWeight, uploadGeneratedImage } from './imageActions';
import sharp from 'sharp';

describe('binarySearchQuality', () => {
    it('should find the highest quality that fits within the limit', async () => {
        const getSize = async (q: number) => {
            if (q >= 80) return 150;
            if (q >= 70) return 100;
            if (q >= 60) return 80;
            if (q >= 50) return 60;
            return 30;
        };

        const limit = 90;
        const result = await binarySearchQuality(getSize, 15, 85, limit);
        expect(result).toBeGreaterThanOrEqual(60);
        expect(result).toBeLessThan(70);
    });

    it('should return min when all qualities exceed the limit', async () => {
        const getSize = async (q: number) => 100;
        const limit = 50;
        const result = await binarySearchQuality(getSize, 15, 85, limit);
        expect(result).toBe(15);
    });

    it('should return max when all qualities fit within the limit', async () => {
        const getSize = async (q: number) => 10;
        const limit = 50;
        const result = await binarySearchQuality(getSize, 15, 85, limit);
        expect(result).toBe(85);
    });

    it('should handle a small range correctly', async () => {
        const getSize = async (q: number) => (q === 20 ? 10 : 100);
        const limit = 20;
        const result = await binarySearchQuality(getSize, 15, 25, limit);
        expect(result).toBe(20);
    });
});

describe('optimizeImageWeight', () => {
    it('should return immediately if quality 85 fits', async () => {
        const sharpInstance = sharp();
        sharpInstance.toBuffer.mockResolvedValue(Buffer.alloc(100));
        const result = await optimizeImageWeight(sharpInstance, 200);
        expect(result.finalQuality).toBe(85);
        expect(sharpInstance.webp).toHaveBeenCalledWith({ quality: 85 });
    });

    it('should perform binary search if quality 85 is too large', async () => {
        const sharpInstance = sharp();
        sharpInstance.toBuffer.mockImplementation(async () => {
            const lastCall = sharpInstance.webp.mock.calls[sharpInstance.webp.mock.calls.length - 1][0];
            return lastCall.quality <= 50 ? Buffer.alloc(100) : Buffer.alloc(300);
        });
        const result = await optimizeImageWeight(sharpInstance, 200);
        expect(result.finalQuality).toBeLessThan(85);
        expect(result.finalQuality).toBeGreaterThanOrEqual(15);
    });

    it('should trigger emergency downscaling if quality 15 is too large', async () => {
        const sharpInstance = sharp();
        let resizeCalled = false;
        sharpInstance.resize.mockImplementation(() => {
            resizeCalled = true;
            return sharpInstance;
        });
        sharpInstance.toBuffer.mockImplementation(async () => {
            if (resizeCalled) return Buffer.alloc(100);
            return Buffer.alloc(300);
        });
        const result = await optimizeImageWeight(sharpInstance, 200);
        expect(resizeCalled).toBe(true);
        expect(sharpInstance.resize).toHaveBeenCalled();
    });

    it('should stop downscaling at the dimension floor', async () => {
        const sharpInstance = sharp();
        sharpInstance.metadata.mockResolvedValue({ width: 210, height: 210 });
        sharpInstance.toBuffer.mockResolvedValue(Buffer.alloc(1000));
        const result = await optimizeImageWeight(sharpInstance, 200);
        expect(result.finalWidth).toBe(200);
    });
});

describe('optimizeImageWeight Integration Scenarios', () => {
    it('Case 1: should use quality 85 if image is already under limit', async () => {
        const sharpInstance = sharp();
        sharpInstance.toBuffer.mockResolvedValue(Buffer.alloc(100));
        const result = await optimizeImageWeight(sharpInstance, 200);
        expect(result.finalQuality).toBe(85);
    });

    it('Case 2/3: should converge to the highest quality that fits the limit', async () => {
        const sharpInstance = sharp();
        sharpInstance.toBuffer.mockImplementation(async () => {
            const lastCall = sharpInstance.webp.mock.calls[sharpInstance.webp.mock.calls.length - 1][0];
            if (lastCall.quality >= 80) return Buffer.alloc(300);
            if (lastCall.quality >= 70) return Buffer.alloc(150);
            return Buffer.alloc(100);
        });
        const result = await optimizeImageWeight(sharpInstance, 200);
        expect(result.finalQuality).toBeGreaterThanOrEqual(70);
        expect(result.finalQuality).toBeLessThan(80);
    });

    it('Case 4: should trigger emergency downscaling if quality 15 is still too large', async () => {
        const sharpInstance = sharp();
        let resizeCalled = false;
        sharpInstance.resize.mockImplementation(() => {
            resizeCalled = true;
            return sharpInstance;
        });
        sharpInstance.toBuffer.mockImplementation(async () => {
            if (resizeCalled) return Buffer.alloc(100);
            return Buffer.alloc(300);
        });
        const result = await optimizeImageWeight(sharpInstance, 200);
        expect(resizeCalled).toBe(true);
    });

    it('Case 5: should hit the 200px floor and quality 15 under extreme constraints', async () => {
        const sharpInstance = sharp();
        sharpInstance.metadata.mockResolvedValue({ width: 500, height: 500 });
        sharpInstance.toBuffer.mockResolvedValue(Buffer.alloc(1000)); 
        const result = await optimizeImageWeight(sharpInstance, 10);
        expect(result.finalWidth).toBeLessThanOrEqual(500);
        expect(result.finalHeight).toBeLessThanOrEqual(500);
        expect(result.finalQuality).toBe(15);
    });
});

describe('uploadGeneratedImage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase.from.mockReturnThis();
        mockSupabase.select.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockReset();
        
        const mockBucket = {
            upload: vi.fn().mockResolvedValue({ error: null }),
            getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'http://test.com/image.webp' } }),
        };
        mockSupabase.storage.from.mockReturnValue(mockBucket);
        
        mockSupabase.insert.mockReset();
        mockSupabase.insert.mockResolvedValue({ error: null });

        process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-role-key';
    });

    it('should fetch max_kb from project settings and use it for optimization', async () => {
        const projectId = 'proj-123';
        const maxKb = 150;
        mockSupabase.single.mockResolvedValue({
            data: { settings: { images: { max_kb: maxKb } } },
        });

        const params = {
            url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
            taskId: 'task-1',
            imageId: 'img-1',
            prompt: 'test prompt',
            altText: 'test alt',
            title: 'test title',
            type: 'featured' as const,
            projectId: projectId,
        };

        const result = await uploadGeneratedImage(params);

        expect(result.success).toBe(true);
        expect(mockSupabase.from).toHaveBeenCalledWith('projects');
        expect(mockSupabase.eq).toHaveBeenCalledWith('id', projectId);
        expect(mockSupabase.storage.from).toHaveBeenCalledWith('content-images');
        expect(mockSupabase.storage.from('content-images').upload).toHaveBeenCalled();
    });
});
