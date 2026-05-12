import { productRepository } from './product.repository'
import { AppError } from '../../types'
import type { CreateProductDto, UpdateProductDto } from '@soumya/shared'

export const productService = {
  async list() {
    return productRepository.list()
  },

  async listActive() {
    return productRepository.listActive()
  },

  async getById(id: string) {
    const product = await productRepository.findById(id)
    if (!product) throw new AppError('NOT_FOUND', 'Product not found', 404)
    return product
  },

  async create(dto: CreateProductDto, createdBy: string) {
    // Check unique name
    const existing = await productRepository.findByName(dto.name)
    if (existing) throw new AppError('DUPLICATE', 'A product with this name already exists', 409)

    return productRepository.create({
      name: dto.name,
      specification: dto.specification,
      category: dto.category,
      cost_price: dto.cost_price,
      selling_price: dto.selling_price,
      created_by: createdBy,
    })
  },

  async update(id: string, dto: UpdateProductDto) {
    const existing = await productRepository.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Product not found', 404)

    // Check name uniqueness if name is being changed
    if (dto.name && dto.name !== existing.name) {
      const conflict = await productRepository.findByName(dto.name)
      if (conflict) throw new AppError('DUPLICATE', 'A product with this name already exists', 409)
    }

    // Validate selling_price >= cost_price
    const newCost = dto.cost_price ?? existing.cost_price
    const newSell = dto.selling_price ?? existing.selling_price
    if (newSell < newCost) {
      throw new AppError('VALIDATION', 'Selling price must be ≥ cost price', 400)
    }

    // If name is changing, cascade to quotations
    if (dto.name && dto.name !== existing.name) {
      await productRepository.cascadeNameToQuotations(id, dto.name)
    }

    return productRepository.update(id, dto)
  },

  async toggleStatus(id: string, status: 'active' | 'inactive') {
    const existing = await productRepository.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Product not found', 404)

    if (status === 'inactive') {
      const { available_qty, reserved_qty } = await productRepository.getInventoryQty(id)
      if (available_qty > 0 || reserved_qty > 0) {
        throw new AppError(
          'PRODUCT_HAS_INVENTORY',
          'This product has quantity remaining in inventory (Available or Reserved). Please clear inventory before inactivating.',
          400
        )
      }
    }

    return productRepository.update(id, { status })
  },
}
