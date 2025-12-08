import { describe, it, expect, vi, beforeEach } from 'vitest';
import toast from 'react-hot-toast';
import { confirmDialog, confirmDelete, confirmAction } from '../../lib/confirmDialog';

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: vi.fn()
}));

describe('confirmDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('confirmDialog function', () => {
    it('should call toast with the correct message', () => {
      confirmDialog('Test message');

      expect(toast).toHaveBeenCalledTimes(1);
      expect(toast).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          duration: Infinity,
          position: 'top-center'
        })
      );
    });

    it('should use default options when none provided', () => {
      const message = 'Are you sure?';
      confirmDialog(message);

      expect(toast).toHaveBeenCalled();
    });

    it('should accept custom confirm and cancel text', () => {
      confirmDialog('Delete item?', {
        confirmText: 'Yes, Delete',
        cancelText: 'No, Keep'
      });

      expect(toast).toHaveBeenCalled();
    });

    it('should accept type option for styling', () => {
      confirmDialog('Warning!', { type: 'danger' });
      expect(toast).toHaveBeenCalled();

      confirmDialog('Info', { type: 'info' });
      expect(toast).toHaveBeenCalledTimes(2);
    });

    it('should return a Promise', () => {
      const result = confirmDialog('Test');
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('confirmDelete function', () => {
    it('should call confirmDialog with delete-specific message', () => {
      confirmDelete('this item');

      expect(toast).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          duration: Infinity
        })
      );
    });

    it('should use default item name when not provided', () => {
      confirmDelete();
      expect(toast).toHaveBeenCalled();
    });

    it('should return a Promise', () => {
      const result = confirmDelete('test item');
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('confirmAction function', () => {
    it('should call confirmDialog with the provided message', () => {
      confirmAction('Continue with action?');

      expect(toast).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          duration: Infinity
        })
      );
    });

    it('should return a Promise', () => {
      const result = confirmAction('Test action');
      expect(result).toBeInstanceOf(Promise);
    });
  });
});
