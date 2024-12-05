import { z } from 'zod';

// Gift item schema
export const GiftSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  gift: z.string().min(1, "Gift description is required"),
  purchased: z.boolean().default(false)
});

export type Gift = z.infer<typeof GiftSchema>;

export class GiftListStore implements DurableObject {
  private state: DurableObjectState;
  
  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    try {
      switch (method) {
        case 'GET':
          return await this.getGiftList();
        case 'POST':
          return await this.addGiftItem(request);
        case 'PUT':
          return await this.updateGiftItem(request);
        case 'DELETE':
          return await this.deleteGiftItem(request);
        default:
          return new Response('Method not allowed', { status: 405 });
      }
    } catch (error) {
      console.error('Error in GiftListStore:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async getGiftList(): Promise<Response> {
    const giftList = await this.state.storage?.list<Gift>();
    const gifts = giftList ? Array.from(giftList.values()) : [];
    
    return new Response(JSON.stringify(gifts), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });
  }

  private async addGiftItem(request: Request): Promise<Response> {
    const body = await request.json();
    const result = GiftSchema.safeParse(body);

    if (!result.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid gift item', 
        details: result.error.errors 
      }), { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        }
      });
    }

    const gift = result.data;
    await this.state.storage?.put(gift.id, gift);

    return new Response(JSON.stringify(gift), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });
  }

  private async updateGiftItem(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const giftId = url.pathname.split('/').pop();
    
    if (!giftId) {
      return new Response(JSON.stringify({ error: 'Gift ID is required' }), { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        }
      });
    }

    const existingGift = await this.state.storage?.get<Gift>(giftId);
    
    if (!existingGift) {
      return new Response(JSON.stringify({ error: 'Gift not found' }), { 
        status: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        }
      });
    }

    const body = await request.json();
    const result = GiftSchema.partial().safeParse(body);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid gift update',
          details: result.error.errors
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
    
    const updatedGift = { ...existingGift, ...result.data };
    await this.state.storage?.put(giftId, updatedGift);

    return new Response(JSON.stringify(updatedGift), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });
  }

  private async deleteGiftItem(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const giftId = url.pathname.split('/').pop();

    if (!giftId) {
      return new Response(JSON.stringify({ error: 'Gift ID is required' }), { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        }
      });
    }

    await this.state.storage?.delete(giftId);

    return new Response(JSON.stringify({ message: 'Gift item deleted' }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });
  }
}

// Extend the Env interface to include the Durable Object namespace
interface Env {
  GIFT_LIST_STORE: DurableObjectNamespace;
}