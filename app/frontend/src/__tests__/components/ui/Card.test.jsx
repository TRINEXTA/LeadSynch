import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';

describe('Card Components', () => {
  describe('Card', () => {
    it('should render children', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should have base styling classes', () => {
      render(<Card data-testid="card">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('bg-white');
      expect(card).toHaveClass('rounded-lg');
      expect(card).toHaveClass('border');
    });

    it('should pass additional props to the div', () => {
      render(<Card data-testid="card" id="my-card">Content</Card>);
      expect(screen.getByTestId('card')).toHaveAttribute('id', 'my-card');
    });
  });

  describe('CardHeader', () => {
    it('should render children', () => {
      render(<CardHeader>Header content</CardHeader>);
      expect(screen.getByText('Header content')).toBeInTheDocument();
    });

    it('should have padding classes', () => {
      render(<CardHeader data-testid="header">Content</CardHeader>);
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('p-6');
    });
  });

  describe('CardTitle', () => {
    it('should render as h3 element', () => {
      render(<CardTitle>Title</CardTitle>);
      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Title');
    });

    it('should have font styling', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>);
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('font-semibold');
    });
  });

  describe('CardContent', () => {
    it('should render children', () => {
      render(<CardContent>Content here</CardContent>);
      expect(screen.getByText('Content here')).toBeInTheDocument();
    });

    it('should have padding classes', () => {
      render(<CardContent data-testid="content">Content</CardContent>);
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('p-6');
    });
  });

  describe('Composed Card', () => {
    it('should render a complete card structure', () => {
      render(
        <Card data-testid="card">
          <CardHeader data-testid="header">
            <CardTitle>My Card Title</CardTitle>
          </CardHeader>
          <CardContent data-testid="content">
            <p>Card body content</p>
          </CardContent>
        </Card>
      );

      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByText('My Card Title')).toBeInTheDocument();
      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.getByText('Card body content')).toBeInTheDocument();
    });
  });
});
