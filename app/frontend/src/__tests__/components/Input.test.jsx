import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../../components/ui/input';

describe('Input Component', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Input className="custom-class" placeholder="test" />);
    expect(screen.getByPlaceholderText('test')).toHaveClass('custom-class');
  });

  it('supports different input types', () => {
    render(<Input type="email" placeholder="Email" />);
    expect(screen.getByPlaceholderText('Email')).toHaveAttribute('type', 'email');
  });

  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} placeholder="test" />);

    fireEvent.change(screen.getByPlaceholderText('test'), {
      target: { value: 'Hello' }
    });
    expect(handleChange).toHaveBeenCalled();
  });

  it('supports disabled state', () => {
    render(<Input disabled placeholder="test" />);
    expect(screen.getByPlaceholderText('test')).toBeDisabled();
  });

  describe('Label', () => {
    it('renders label when provided', () => {
      render(<Input label="Email address" />);
      expect(screen.getByText('Email address')).toBeInTheDocument();
    });

    it('associates label with input via htmlFor', () => {
      render(<Input label="Email" id="email-input" />);
      const label = screen.getByText('Email');
      const input = screen.getByRole('textbox');

      expect(label).toHaveAttribute('for', 'email-input');
      expect(input).toHaveAttribute('id', 'email-input');
    });

    it('shows required indicator when required', () => {
      render(<Input label="Email" required />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('displays error message', () => {
      render(<Input error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('sets aria-invalid when error is present', () => {
      render(<Input error="Error message" placeholder="test" />);
      expect(screen.getByPlaceholderText('test')).toHaveAttribute('aria-invalid', 'true');
    });

    it('has error message as role="alert"', () => {
      render(<Input error="Error message" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Error message');
    });

    it('applies error styles', () => {
      render(<Input error="Error" placeholder="test" />);
      expect(screen.getByPlaceholderText('test')).toHaveClass('border-red-500');
    });
  });

  describe('Hint text', () => {
    it('displays hint when provided', () => {
      render(<Input hint="Must be at least 8 characters" />);
      expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument();
    });

    it('hides hint when error is present', () => {
      render(<Input hint="Hint text" error="Error text" />);
      expect(screen.queryByText('Hint text')).not.toBeInTheDocument();
      expect(screen.getByText('Error text')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has aria-describedby pointing to error message', () => {
      render(<Input id="test" error="Error message" placeholder="test" />);
      const input = screen.getByPlaceholderText('test');

      expect(input).toHaveAttribute('aria-describedby', 'test-error');
    });

    it('has aria-describedby pointing to hint', () => {
      render(<Input id="test" hint="Hint text" placeholder="test" />);
      const input = screen.getByPlaceholderText('test');

      expect(input).toHaveAttribute('aria-describedby', 'test-hint');
    });

    it('has aria-required when required', () => {
      render(<Input required placeholder="test" />);
      expect(screen.getByPlaceholderText('test')).toHaveAttribute('aria-required', 'true');
    });

    it('generates unique id when not provided', () => {
      render(<Input label="Email" />);
      const input = screen.getByRole('textbox');

      expect(input.id).toBeTruthy();
      expect(input.id).not.toBe('');
    });

    it('forwards ref to input element', () => {
      const ref = { current: null };
      render(<Input ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });
});
