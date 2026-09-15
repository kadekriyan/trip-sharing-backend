import { PaymentService } from '../../src/services/payment.service'
import { prisma } from '../../src/config/database'
import { EmailService } from '../../src/services/email.service'
import { ApiError } from '../../src/utils/errors'

jest.mock('../../src/config/database', () => ({
  prisma: {
    participant: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
  },
}))

jest.mock('../../src/config/midtrans', () => ({
  snap: {
    createTransaction: jest.fn(),
  },
}))

jest.mock('../../src/services/email.service', () => ({
  EmailService: {
    sendPaymentReceipt: jest.fn().mockResolvedValue(true),
  },
}))

describe('PaymentService.simulatePayment', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should successfully simulate payment settlement and mark participant as paid', async () => {
    const mockPayment = {
      id: 'pay-123',
      participant_id: 'part-123',
      booking_group_id: 'grp-1',
      amount: 900000,
      midtrans_order_id: 'TRIP-part-123-1700000000000',
      status: 'pending',
      participant: {
        id: 'part-123',
        full_name: 'John Doe',
        user: { email: 'john@example.com' },
      },
    }

    ;(prisma.payment.findFirst as jest.Mock).mockResolvedValue(mockPayment)
    ;(prisma.payment.update as jest.Mock).mockResolvedValue({
      ...mockPayment,
      status: 'completed',
      completion_time: new Date(),
    })
    ;(prisma.participant.update as jest.Mock).mockResolvedValue({
      id: 'part-123',
      payment_status: 'paid',
    })

    const result = await PaymentService.simulatePayment('pay-123', 'settle')

    expect(prisma.payment.findFirst).toHaveBeenCalled()
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pay-123' },
        data: expect.objectContaining({ status: 'completed' }),
      })
    )
    expect(prisma.participant.update).toHaveBeenCalledWith({
      where: { id: 'part-123' },
      data: { payment_status: 'paid' },
    })
    expect(EmailService.sendPaymentReceipt).toHaveBeenCalledWith('john@example.com', {
      participant_name: 'John Doe',
      amount: 900000,
    })
    expect(result.status).toBe('ok')
    expect(result.payment.status).toBe('completed')
  })

  it('should handle cancel/expire simulation and mark participant as cancelled', async () => {
    const mockPayment = {
      id: 'pay-123',
      participant_id: 'part-123',
      booking_group_id: 'grp-1',
      amount: 900000,
      midtrans_order_id: 'TRIP-part-123-1700000000000',
      status: 'pending',
      participant: {
        id: 'part-123',
        full_name: 'John Doe',
        user: { email: 'john@example.com' },
      },
    }

    ;(prisma.payment.findFirst as jest.Mock).mockResolvedValue(mockPayment)
    ;(prisma.payment.update as jest.Mock).mockResolvedValue({
      ...mockPayment,
      status: 'failed',
    })
    ;(prisma.participant.update as jest.Mock).mockResolvedValue({
      id: 'part-123',
      payment_status: 'cancelled',
    })

    const result = await PaymentService.simulatePayment('pay-123', 'expire')

    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pay-123' },
        data: expect.objectContaining({ status: 'failed' }),
      })
    )
    expect(prisma.participant.update).toHaveBeenCalledWith({
      where: { id: 'part-123' },
      data: { payment_status: 'cancelled' },
    })
    expect(EmailService.sendPaymentReceipt).not.toHaveBeenCalled()
    expect(result.payment.status).toBe('failed')
  })

  it('should auto-create pending payment if searching by participantId and payment does not exist yet', async () => {
    const mockParticipant = {
      id: 'part-456',
      full_name: 'Jane Doe',
      phone_number: '08123456789',
      user: { email: 'jane@example.com' },
      booking_group: {
        id: 'grp-2',
        price_per_person: 750000,
        trip: { id: 'trip-1', destination: { id: 'dest-1', name: 'Bromo' } },
      },
    }

    ;(prisma.payment.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.participant.findUnique as jest.Mock).mockResolvedValue(mockParticipant)
    ;(prisma.payment.create as jest.Mock).mockResolvedValue({
      id: 'pay-created',
      participant_id: 'part-456',
      booking_group_id: 'grp-2',
      amount: 750000,
      midtrans_order_id: 'TRIP-part-456-1700000000000',
      status: 'pending',
      participant: mockParticipant,
    })
    ;(prisma.payment.update as jest.Mock).mockResolvedValue({
      id: 'pay-created',
      participant_id: 'part-456',
      status: 'completed',
    })
    ;(prisma.participant.update as jest.Mock).mockResolvedValue({
      id: 'part-456',
      payment_status: 'paid',
    })

    const result = await PaymentService.simulatePayment('part-456', 'settle')

    expect(prisma.payment.create).toHaveBeenCalled()
    expect(prisma.payment.update).toHaveBeenCalled()
    expect(prisma.participant.update).toHaveBeenCalledWith({
      where: { id: 'part-456' },
      data: { payment_status: 'paid' },
    })
    expect(result.status).toBe('ok')
  })

  it('should throw 404 ApiError if neither payment nor participant is found', async () => {
    ;(prisma.payment.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.participant.findUnique as jest.Mock).mockResolvedValue(null)

    await expect(PaymentService.simulatePayment('unknown-id', 'settle')).rejects.toThrow(ApiError)
  })
})
